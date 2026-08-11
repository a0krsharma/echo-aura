/**
 * lib/audioManager.ts
 * ─────────────────────────────────────────────────────
 * Global Audio Manager
 * Coordinates audio playback across the platform to prevent race conditions
 * and ensure only one audio plays at a time (unless explicitly allowed)
 */

type AudioState = 'idle' | 'loading' | 'playing' | 'paused' | 'error';

interface AudioInstance {
  id: string;
  audioElement: HTMLAudioElement;
  state: AudioState;
  priority: number; // Higher priority audio can interrupt lower priority
}

class AudioManager {
  private instances: Map<string, AudioInstance> = new Map();
  private activeInstanceId: string | null = null;
  private listeners: Set<(activeId: string | null) => void> = new Set();

  /**
   * Register a new audio instance
   */
  register(id: string, audioElement: HTMLAudioElement, priority: number = 0): void {
    const instance: AudioInstance = {
      id,
      audioElement,
      state: 'idle',
      priority,
    };

    this.instances.set(id, instance);

    // Set up event listeners for state tracking
    audioElement.addEventListener('loadstart', () => this.updateState(id, 'loading'));
    audioElement.addEventListener('playing', () => this.updateState(id, 'playing'));
    audioElement.addEventListener('pause', () => this.updateState(id, 'paused'));
    audioElement.addEventListener('ended', () => this.updateState(id, 'idle'));
    audioElement.addEventListener('error', () => this.updateState(id, 'error'));
  }

  /**
   * Unregister an audio instance
   */
  unregister(id: string): void {
    const instance = this.instances.get(id);
    if (instance) {
      // Clean up event listeners
      const audio = instance.audioElement;
      audio.removeEventListener('loadstart', () => this.updateState(id, 'loading'));
      audio.removeEventListener('playing', () => this.updateState(id, 'playing'));
      audio.removeEventListener('pause', () => this.updateState(id, 'paused'));
      audio.removeEventListener('ended', () => this.updateState(id, 'idle'));
      audio.removeEventListener('error', () => this.updateState(id, 'error'));

      // Stop audio if playing
      audio.pause();
      audio.currentTime = 0;

      this.instances.delete(id);

      if (this.activeInstanceId === id) {
        this.activeInstanceId = null;
        this.notifyListeners();
      }
    }
  }

  /**
   * Request to play an audio instance
   * Returns true if the request was granted, false otherwise
   */
  async requestPlay(id: string): Promise<boolean> {
    const instance = this.instances.get(id);
    if (!instance) return false;

    // If this is already the active instance, just play
    if (this.activeInstanceId === id) {
      try {
        await instance.audioElement.play();
        return true;
      } catch (error) {
        console.error(`[AudioManager] Error playing ${id}:`, error);
        this.updateState(id, 'error');
        return false;
      }
    }

    // Check if we should interrupt the current active instance
    const currentActive = this.activeInstanceId ? this.instances.get(this.activeInstanceId) : null;
    
    if (currentActive && instance.priority <= currentActive.priority) {
      // Don't interrupt if priority is not higher
      return false;
    }

    // Pause current active instance if exists
    if (currentActive) {
      currentActive.audioElement.pause();
      this.updateState(this.activeInstanceId!, 'paused');
    }

    // Set new active instance
    this.activeInstanceId = id;
    this.notifyListeners();

    try {
      await instance.audioElement.play();
      return true;
    } catch (error) {
      console.error(`[AudioManager] Error playing ${id}:`, error);
      this.updateState(id, 'error');
      return false;
    }
  }

  /**
   * Pause an audio instance
   */
  pause(id: string): void {
    const instance = this.instances.get(id);
    if (instance) {
      instance.audioElement.pause();
      this.updateState(id, 'paused');

      if (this.activeInstanceId === id) {
        this.activeInstanceId = null;
        this.notifyListeners();
      }
    }
  }

  /**
   * Stop an audio instance (pause and reset to beginning)
   */
  stop(id: string): void {
    const instance = this.instances.get(id);
    if (instance) {
      instance.audioElement.pause();
      instance.audioElement.currentTime = 0;
      this.updateState(id, 'idle');

      if (this.activeInstanceId === id) {
        this.activeInstanceId = null;
        this.notifyListeners();
      }
    }
  }

  /**
   * Get the current active audio instance ID
   */
  getActiveId(): string | null {
    return this.activeInstanceId;
  }

  /**
   * Get the state of an audio instance
   */
  getState(id: string): AudioState {
    const instance = this.instances.get(id);
    return instance?.state || 'idle';
  }

  /**
   * Subscribe to active audio changes
   */
  subscribe(listener: (activeId: string | null) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Update the state of an audio instance
   */
  private updateState(id: string, state: AudioState): void {
    const instance = this.instances.get(id);
    if (instance) {
      instance.state = state;
    }
  }

  /**
   * Notify all listeners of active audio changes
   */
  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.activeInstanceId));
  }

  /**
   * Pause all audio instances
   */
  pauseAll(): void {
    this.instances.forEach((instance, id) => {
      instance.audioElement.pause();
      this.updateState(id, 'paused');
    });
    this.activeInstanceId = null;
    this.notifyListeners();
  }

  /**
   * Get all registered instance IDs
   */
  getInstanceIds(): string[] {
    return Array.from(this.instances.keys());
  }

  /**
   * Clean up all instances (call when app unmounts)
   */
  destroy(): void {
    this.instances.forEach((instance, id) => {
      instance.audioElement.pause();
      instance.audioElement.currentTime = 0;
      this.unregister(id);
    });
    this.listeners.clear();
  }
}

// Singleton instance
export const audioManager = new AudioManager();

// Export types
export type { AudioState, AudioInstance };
