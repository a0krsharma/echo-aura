/**
 * lib/radarAggregator.ts
 * ─────────────────────────────────────────────────────
 * Acoustic Velocity Trending Engine for Echo Radar (India & World Focused).
 * Computes time-decayed velocity scores based on:
 *   - L (Live Listeners / Active Stage Nodes) * 10
 *   - V (Voice Replies / Reverbs) * 5
 *   - S (Shares / Orbits) * 3
 *   - P (Pulses / Likes) * 1
 * Divided by (T + 2)^G with gravity G = 1.6
 */

import {
  collection,
  doc,
  getDocs,
  setDoc,
  query,
  limit,
} from 'firebase/firestore';
import { getFirebaseDb } from '@/lib/firebase';
import {
  RADAR_TRACKED_CATEGORIES,
  RadarCategoryId,
  RadarRegion,
  RadarTopicItem,
  getRadarFeedDocId,
} from '@/lib/categories';

// Gravity factor for time decay (1.5 to 1.8)
const GRAVITY = 1.6;

export function calculateVelocityScore(
  liveListeners: number,
  voiceReplies: number,
  shares: number,
  pulses: number,
  hoursElapsed: number
): number {
  const acousticEnergy =
    liveListeners * 10 +
    voiceReplies * 5 +
    shares * 3 +
    pulses * 1;

  const timeDecay = Math.pow(Math.max(0, hoursElapsed) + 2, GRAVITY);
  const rawScore = (acousticEnergy / timeDecay) * 100;
  return Math.max(1, Math.round(rawScore));
}

// Utility to recursively remove undefined properties before sending to Firestore
export function cleanFirestoreData<T>(obj: T): T {
  return JSON.parse(
    JSON.stringify(obj, (_, v) => (v === undefined ? null : v))
  );
}

// Curated seed data for INDIA and WORLD focus (25-30+ items per category)
const REGIONAL_SEEDS: Record<RadarRegion, Record<RadarCategoryId, RadarTopicItem[]>> = {
  "india": {
    "trending": [
      {
        "tag": "#QuickCommerceWar",
        "category": "trending",
        "region": "india",
        "headline": "Blinkit vs Zepto vs Instamart burning billions as 10-minute delivery disrupts mom-and-pop stores",
        "velocity_score": 9950,
        "live_rooms": 7,
        "voice_replies": 320,
        "total_pulses": 2400,
        "shares": 180
      },
      {
        "tag": "#GambhirVsSeniors",
        "category": "trending",
        "region": "india",
        "headline": "Head coach Gautam Gambhir's radical tactical overhaul causes friction in the dressing room",
        "velocity_score": 9620,
        "live_rooms": 6,
        "voice_replies": 290,
        "total_pulses": 2150,
        "shares": 150
      },
      {
        "tag": "#70HourWorkWeek",
        "category": "trending",
        "region": "india",
        "headline": "Tech titans clash over 70-hour work weeks vs toxic burnout culture and mental health in Indian IT",
        "velocity_score": 9340,
        "live_rooms": 5,
        "voice_replies": 275,
        "total_pulses": 1980,
        "shares": 140
      },
      {
        "tag": "#SEBIFnOCrackdown",
        "category": "trending",
        "region": "india",
        "headline": "Retail traders furious as SEBI imposes strict lot size limits and expiry curbs on index options",
        "velocity_score": 9120,
        "live_rooms": 5,
        "voice_replies": 240,
        "total_pulses": 1850,
        "shares": 125
      },
      {
        "tag": "#BollywoodBoycott",
        "category": "trending",
        "region": "india",
        "headline": "New big-budget historical epic faces nationwide boycott campaign over controversial casting decisions",
        "velocity_score": 8950,
        "live_rooms": 4,
        "voice_replies": 215,
        "total_pulses": 1720,
        "shares": 110
      },
      {
        "tag": "#NarayanaMurthyDebate",
        "category": "trending",
        "region": "india",
        "headline": "Young professionals push back against legacy founders demanding 6-day work weeks without equity",
        "velocity_score": 8800,
        "live_rooms": 4,
        "voice_replies": 195,
        "total_pulses": 1600,
        "shares": 95
      },
      {
        "tag": "#ByjusCollapse",
        "category": "trending",
        "region": "india",
        "headline": "Insolvency resolution sparks explosive allegations of asset stripping and investor betrayal",
        "velocity_score": 8640,
        "live_rooms": 4,
        "voice_replies": 180,
        "total_pulses": 1520,
        "shares": 88
      },
      {
        "tag": "#OlaServiceCrisis",
        "category": "trending",
        "region": "india",
        "headline": "Consumer court notices mount against EV giant over battery breakdowns and repair backlogs",
        "velocity_score": 8450,
        "live_rooms": 3,
        "voice_replies": 165,
        "total_pulses": 1410,
        "shares": 75
      },
      {
        "tag": "#INDvsPAKStandoff",
        "category": "trending",
        "region": "india",
        "headline": "BCCI refuses to travel to Pakistan for Champions Trophy; PCB demands hybrid neutral venue parity",
        "velocity_score": 8300,
        "live_rooms": 3,
        "voice_replies": 150,
        "total_pulses": 1350,
        "shares": 70
      },
      {
        "tag": "#ArijitVsAutotune",
        "category": "trending",
        "region": "india",
        "headline": "Singing icon exposes music labels for heavily processing studio vocals and killing raw acoustic talent",
        "velocity_score": 8150,
        "live_rooms": 3,
        "voice_replies": 140,
        "total_pulses": 1280,
        "shares": 65
      },
      {
        "tag": "#ElectoralBondsVerdict",
        "category": "trending",
        "region": "india",
        "headline": "Supreme Court scrutiny exposes corporate donations to political parties sparking fiery debate",
        "velocity_score": 8020,
        "live_rooms": 3,
        "voice_replies": 135,
        "total_pulses": 1210,
        "shares": 60
      },
      {
        "tag": "#AIReplacingEngineers",
        "category": "trending",
        "region": "india",
        "headline": "Service IT giants freeze campus hiring as AI coding agents automate entry-level QA and backend roles",
        "velocity_score": 7900,
        "live_rooms": 3,
        "voice_replies": 125,
        "total_pulses": 1150,
        "shares": 55
      },
      {
        "tag": "#BangaloreTrafficTax",
        "category": "trending",
        "region": "india",
        "headline": "Congestion fee proposal for tech corridors triggers explosive outrage among IT commuters",
        "velocity_score": 7780,
        "live_rooms": 2,
        "voice_replies": 115,
        "total_pulses": 1080,
        "shares": 50
      },
      {
        "tag": "#HardikCaptaincyRow",
        "category": "trending",
        "region": "india",
        "headline": "Franchise loyalty divided as fans debate leadership transition and player dynamics",
        "velocity_score": 7650,
        "live_rooms": 2,
        "voice_replies": 110,
        "total_pulses": 1020,
        "shares": 48
      },
      {
        "tag": "#PaperLeakScandal",
        "category": "trending",
        "region": "india",
        "headline": "National testing agency faces intense protests over exam security and coaching mafia nexus",
        "velocity_score": 7520,
        "live_rooms": 2,
        "voice_replies": 105,
        "total_pulses": 980,
        "shares": 45
      },
      {
        "tag": "#DiljitTicketScalping",
        "category": "trending",
        "region": "india",
        "headline": "Concert tickets resold for 10x price on black market prompting ED raids on ticket brokers",
        "velocity_score": 7400,
        "live_rooms": 2,
        "voice_replies": 100,
        "total_pulses": 940,
        "shares": 42
      },
      {
        "tag": "#AdaniHindenburgRound2",
        "category": "trending",
        "region": "india",
        "headline": "New investigative disclosures spark intense floor debates and regulatory subpoenas",
        "velocity_score": 7290,
        "live_rooms": 2,
        "voice_replies": 95,
        "total_pulses": 900,
        "shares": 40
      },
      {
        "tag": "#UPITransactionFees",
        "category": "trending",
        "region": "india",
        "headline": "Debate ignites over whether payment apps will introduce interchange fees for merchant transactions",
        "velocity_score": 7180,
        "live_rooms": 2,
        "voice_replies": 90,
        "total_pulses": 870,
        "shares": 38
      },
      {
        "tag": "#OTTStrictCensorship",
        "category": "trending",
        "region": "india",
        "headline": "Government draft rules demand self-regulatory cuts on mature language and political satire on OTT",
        "velocity_score": 7050,
        "live_rooms": 2,
        "voice_replies": 85,
        "total_pulses": 840,
        "shares": 35
      },
      {
        "tag": "#FakeInfluencerRaid",
        "category": "trending",
        "region": "india",
        "headline": "Consumer ministry cracks down on fin-influencers promoting dubious stock advisory groups",
        "velocity_score": 6920,
        "live_rooms": 2,
        "voice_replies": 80,
        "total_pulses": 810,
        "shares": 32
      },
      {
        "tag": "#GroomingScamsAlert",
        "category": "trending",
        "region": "india",
        "headline": "Digital arrest scams drain crores from senior citizens as cyber police issue red alerts",
        "velocity_score": 6810,
        "live_rooms": 1,
        "voice_replies": 75,
        "total_pulses": 780,
        "shares": 30
      },
      {
        "tag": "#GigWorkerRights",
        "category": "trending",
        "region": "india",
        "headline": "Delivery riders protest pay cuts and algorithmic penalties as state governments draft welfare bill",
        "velocity_score": 6700,
        "live_rooms": 1,
        "voice_replies": 70,
        "total_pulses": 750,
        "shares": 28
      },
      {
        "tag": "#AnimalMovieDiscourse",
        "category": "trending",
        "region": "india",
        "headline": "Filmmakers and critics spar over glorification of violence vs cinematic freedom of expression",
        "velocity_score": 6590,
        "live_rooms": 1,
        "voice_replies": 65,
        "total_pulses": 720,
        "shares": 25
      },
      {
        "tag": "#CryptoTaxDebate",
        "category": "trending",
        "region": "india",
        "headline": "Web3 founders demand reduction of 1% TDS and 30% flat tax rate to stop developer brain drain",
        "velocity_score": 6480,
        "live_rooms": 1,
        "voice_replies": 60,
        "total_pulses": 690,
        "shares": 22
      },
      {
        "tag": "#RealEstateBubbleIndia",
        "category": "trending",
        "region": "india",
        "headline": "Skyrocketing luxury flat prices in Gurgaon and Mumbai raise fears of speculative bubble",
        "velocity_score": 6370,
        "live_rooms": 1,
        "voice_replies": 55,
        "total_pulses": 660,
        "shares": 20
      }
    ],
    "news": [
      {
        "tag": "#ElectoralBondsVerdict",
        "headline": "Supreme Court transparency mandate reveals corporate donor networks and political funding streams",
        "velocity_score": 9400,
        "live_rooms": 5,
        "voice_replies": 260,
        "total_pulses": 1950,
        "shares": 130,
        "category": "news",
        "region": "india"
      },
      {
        "tag": "#OneNationOneElection",
        "headline": "High-level committee submits report on simultaneous national and state elections sparking fierce debate",
        "velocity_score": 9150,
        "live_rooms": 4,
        "voice_replies": 230,
        "total_pulses": 1780,
        "shares": 115,
        "category": "news",
        "region": "india"
      },
      {
        "tag": "#IndiaCanadaStandoff",
        "headline": "Diplomatic ties hit historic low following tit-for-tat expulsions of high commissioners",
        "velocity_score": 8890,
        "live_rooms": 4,
        "voice_replies": 200,
        "total_pulses": 1620,
        "shares": 105,
        "category": "news",
        "region": "india"
      },
      {
        "tag": "#SubClassificationQuota",
        "headline": "Landmark apex court verdict allows states to create sub-quotas within reserved categories",
        "velocity_score": 8620,
        "live_rooms": 3,
        "voice_replies": 185,
        "total_pulses": 1500,
        "shares": 90,
        "category": "news",
        "region": "india"
      },
      {
        "tag": "#IndiaChinaBorderPact",
        "headline": "Patrolling agreement reached at LAC in Eastern Ladakh to ease four-year military standoff",
        "velocity_score": 8450,
        "live_rooms": 3,
        "voice_replies": 170,
        "total_pulses": 1390,
        "shares": 80,
        "category": "news",
        "region": "india"
      },
      {
        "tag": "#UniformCivilCode",
        "headline": "State assembly passes comprehensive UCC bill sparking national legal challenges and debates",
        "velocity_score": 8280,
        "live_rooms": 3,
        "voice_replies": 155,
        "total_pulses": 1280,
        "shares": 72,
        "category": "news",
        "region": "india"
      },
      {
        "tag": "#AirPollutionEmergency",
        "headline": "Air quality index enters severe category in Delhi NCR as crop burning and winter smog peak",
        "velocity_score": 8100,
        "live_rooms": 3,
        "voice_replies": 140,
        "total_pulses": 1190,
        "shares": 65,
        "category": "news",
        "region": "india"
      },
      {
        "tag": "#PaperLeakCBIProbe",
        "headline": "Central agencies unearth multi-state network involved in leaking entrance exam question papers",
        "velocity_score": 7950,
        "live_rooms": 2,
        "voice_replies": 130,
        "total_pulses": 1110,
        "shares": 58,
        "category": "news",
        "region": "india"
      },
      {
        "tag": "#DefenseExportSurge",
        "headline": "India's defense manufacturing exports cross record milestones with missile and radar systems",
        "velocity_score": 7790,
        "live_rooms": 2,
        "voice_replies": 120,
        "total_pulses": 1040,
        "shares": 52,
        "category": "news",
        "region": "india"
      },
      {
        "tag": "#ISROGaganyaanTest",
        "headline": "Space agency successfully executes abort test vehicle mission for human spaceflight program",
        "velocity_score": 7640,
        "live_rooms": 2,
        "voice_replies": 110,
        "total_pulses": 980,
        "shares": 48,
        "category": "news",
        "region": "india"
      },
      {
        "tag": "#VoterRollRevision",
        "headline": "Opposition demands forensic audit of electronic voting machine voter turnouts across key battlegrounds",
        "velocity_score": 7500,
        "live_rooms": 2,
        "voice_replies": 105,
        "total_pulses": 920,
        "shares": 44,
        "category": "news",
        "region": "india"
      },
      {
        "tag": "#FarmersMSPProtest",
        "headline": "Farmer unions organize nationwide tractor marches demanding legal guarantee on minimum support prices",
        "velocity_score": 7380,
        "live_rooms": 2,
        "voice_replies": 95,
        "total_pulses": 870,
        "shares": 40,
        "category": "news",
        "region": "india"
      },
      {
        "tag": "#NewCriminalLaws",
        "headline": "Bharatiya Nyaya Sanhita replaces colonial penal code amid legal fraternity implementation debates",
        "velocity_score": 7250,
        "live_rooms": 2,
        "voice_replies": 90,
        "total_pulses": 830,
        "shares": 36,
        "category": "news",
        "region": "india"
      },
      {
        "tag": "#RailwaySafetyAudit",
        "headline": "Parliamentary panel orders nationwide installation of Kavach anti-collision safety systems",
        "velocity_score": 7120,
        "live_rooms": 1,
        "voice_replies": 85,
        "total_pulses": 790,
        "shares": 32,
        "category": "news",
        "region": "india"
      },
      {
        "tag": "#CensusDelayDebate",
        "headline": "Economists raise concerns over outdated demographic benchmarks as national census faces timeline review",
        "velocity_score": 6990,
        "live_rooms": 1,
        "voice_replies": 80,
        "total_pulses": 750,
        "shares": 30,
        "category": "news",
        "region": "india"
      },
      {
        "tag": "#GreenHydrogenMission",
        "headline": "Cabinet approves incentives for domestic electrolyser manufacturing to boost clean fuel exports",
        "velocity_score": 6850,
        "live_rooms": 1,
        "voice_replies": 75,
        "total_pulses": 710,
        "shares": 26,
        "category": "news",
        "region": "india"
      },
      {
        "tag": "#DigitalPersonalDataAct",
        "headline": "Ministry releases draft compliance rules with heavy penalties for user privacy breaches",
        "velocity_score": 6720,
        "live_rooms": 1,
        "voice_replies": 70,
        "total_pulses": 680,
        "shares": 24,
        "category": "news",
        "region": "india"
      },
      {
        "tag": "#BulletTrainProgress",
        "headline": "High-speed rail corridor completes major undersea tunnel excavation between Mumbai and Ahmedabad",
        "velocity_score": 6600,
        "live_rooms": 1,
        "voice_replies": 65,
        "total_pulses": 640,
        "shares": 22,
        "category": "news",
        "region": "india"
      },
      {
        "tag": "#SemiconductorFabGroundbreaking",
        "headline": "Construction begins on India's first commercial chip fabrication facility in Dholera",
        "velocity_score": 6480,
        "live_rooms": 1,
        "voice_replies": 60,
        "total_pulses": 610,
        "shares": 20,
        "category": "news",
        "region": "india"
      },
      {
        "tag": "#WaterCrisisInMegacities",
        "headline": "Groundwater depletion triggers emergency rationing across Bengaluru and Chennai suburbs",
        "velocity_score": 6350,
        "live_rooms": 1,
        "voice_replies": 55,
        "total_pulses": 580,
        "shares": 18,
        "category": "news",
        "region": "india"
      },
      {
        "tag": "#CoastalHighwayProtest",
        "headline": "Environmental groups petition green tribunal over coastal regulatory zone land reclamation",
        "velocity_score": 6220,
        "live_rooms": 1,
        "voice_replies": 50,
        "total_pulses": 550,
        "shares": 16,
        "category": "news",
        "region": "india"
      },
      {
        "tag": "#BorderTradeProtocols",
        "headline": "Land port authorities upgrade digital cargo clearance gates along eastern trade corridors",
        "velocity_score": 6100,
        "live_rooms": 1,
        "voice_replies": 45,
        "total_pulses": 520,
        "shares": 14,
        "category": "news",
        "region": "india"
      },
      {
        "tag": "#SolarRooftopSurge",
        "headline": "PM Surya Ghar scheme crosses million installation milestone driven by heavy grid subsidies",
        "velocity_score": 5980,
        "live_rooms": 1,
        "voice_replies": 40,
        "total_pulses": 490,
        "shares": 12,
        "category": "news",
        "region": "india"
      },
      {
        "tag": "#AviationSafetyAudit",
        "headline": "DGCA issues show-cause notices to airlines over persistent flight delay reporting anomalies",
        "velocity_score": 5860,
        "live_rooms": 1,
        "voice_replies": 35,
        "total_pulses": 460,
        "shares": 10,
        "category": "news",
        "region": "india"
      },
      {
        "tag": "#JudicialBacklogReform",
        "headline": "Law Commission proposes virtual fast-track tribunals to resolve 50 million pending cases",
        "velocity_score": 5750,
        "live_rooms": 1,
        "voice_replies": 30,
        "total_pulses": 430,
        "shares": 8,
        "category": "news",
        "region": "india"
      }
    ],
    "tech": [
      {
        "tag": "#OpenSourceAIBharat",
        "headline": "Indian research labs release multi-lingual foundation models trained on 22 native dialects",
        "velocity_score": 9300,
        "live_rooms": 5,
        "voice_replies": 240,
        "total_pulses": 1820,
        "shares": 120,
        "category": "tech",
        "region": "india"
      },
      {
        "tag": "#DeepSeekShockwave",
        "headline": "Ultra-low-cost Chinese reasoning model triggers panic sell-off in US chip and cloud stocks",
        "velocity_score": 9100,
        "live_rooms": 4,
        "voice_replies": 220,
        "total_pulses": 1690,
        "shares": 110,
        "category": "tech",
        "region": "india"
      },
      {
        "tag": "#IndiaSemiconductorMission",
        "headline": "Tata-PSMC chip fab begins packaging trial wafers in Gujarat ahead of 2026 commercial rollout",
        "velocity_score": 8850,
        "live_rooms": 4,
        "voice_replies": 190,
        "total_pulses": 1510,
        "shares": 95,
        "category": "tech",
        "region": "india"
      },
      {
        "tag": "#ITLayoffAnxiety",
        "headline": "Tier-1 tech service firms reduce middle management layers as AI code generators increase output per engineer",
        "velocity_score": 8600,
        "live_rooms": 3,
        "voice_replies": 175,
        "total_pulses": 1400,
        "shares": 85,
        "category": "tech",
        "region": "india"
      },
      {
        "tag": "#UPIInternationalPush",
        "headline": "NPCI expands QR payment settlement corridors across UAE, Singapore, France, and Japan",
        "velocity_score": 8400,
        "live_rooms": 3,
        "voice_replies": 160,
        "total_pulses": 1310,
        "shares": 75,
        "category": "tech",
        "region": "india"
      },
      {
        "tag": "#AgenticAIRevolution",
        "headline": "Autonomous software agents replacing SaaS dashboards with direct natural language execution",
        "velocity_score": 8200,
        "live_rooms": 3,
        "voice_replies": 145,
        "total_pulses": 1220,
        "shares": 68,
        "category": "tech",
        "region": "india"
      },
      {
        "tag": "#CrowdStrikeLessons",
        "headline": "Enterprise security chiefs redesign kernel-level driver update policies following historic outage",
        "velocity_score": 8000,
        "live_rooms": 2,
        "voice_replies": 135,
        "total_pulses": 1140,
        "shares": 60,
        "category": "tech",
        "region": "india"
      },
      {
        "tag": "#QuantumComputingHub",
        "headline": "Department of Science funds national quantum network testbed connecting premier IITs",
        "velocity_score": 7800,
        "live_rooms": 2,
        "voice_replies": 125,
        "total_pulses": 1070,
        "shares": 52,
        "category": "tech",
        "region": "india"
      },
      {
        "tag": "#AppleIndiaManufacturing",
        "headline": "Foxconn and Pegatron expand iPhone Pro assembly lines in Tamil Nadu and Karnataka",
        "velocity_score": 7650,
        "live_rooms": 2,
        "voice_replies": 115,
        "total_pulses": 1000,
        "shares": 48,
        "category": "tech",
        "region": "india"
      },
      {
        "tag": "#NvidiaGPUCrunch",
        "headline": "Startups struggle to access H100 GPU clusters as AI compute costs soar to record levels",
        "velocity_score": 7500,
        "live_rooms": 2,
        "voice_replies": 105,
        "total_pulses": 940,
        "shares": 42,
        "category": "tech",
        "region": "india"
      },
      {
        "tag": "#DigitalRupeeAdoption",
        "headline": "RBI expands offline retail CBDC trials using NFC card taps for zero-connectivity transactions",
        "velocity_score": 7350,
        "live_rooms": 2,
        "voice_replies": 95,
        "total_pulses": 880,
        "shares": 38,
        "category": "tech",
        "region": "india"
      },
      {
        "tag": "#DeepfakeLegislation",
        "headline": "Government mandates AI watermark tags on synthetic media to combat political impersonation",
        "velocity_score": 7200,
        "live_rooms": 1,
        "voice_replies": 90,
        "total_pulses": 830,
        "shares": 34,
        "category": "tech",
        "region": "india"
      },
      {
        "tag": "#ZeroDayCyberThreats",
        "headline": "Critical infrastructure operators upgrade air-gapped firewalls after state-sponsored intrusion attempts",
        "velocity_score": 7050,
        "live_rooms": 1,
        "voice_replies": 85,
        "total_pulses": 790,
        "shares": 30,
        "category": "tech",
        "region": "india"
      },
      {
        "tag": "#SatelliteInternetIndia",
        "headline": "Starlink and Eutelsat OneWeb await spectrum allocation to launch rural satellite broadband",
        "velocity_score": 6900,
        "live_rooms": 1,
        "voice_replies": 80,
        "total_pulses": 750,
        "shares": 28,
        "category": "tech",
        "region": "india"
      },
      {
        "tag": "#OpenSourceVSCorporateAI",
        "headline": "Developers debate Meta LLaMA and Mistral vs proprietary closed API dominance",
        "velocity_score": 6750,
        "live_rooms": 1,
        "voice_replies": 75,
        "total_pulses": 710,
        "shares": 25,
        "category": "tech",
        "region": "india"
      },
      {
        "tag": "#WebAssemblyEdgeComputing",
        "headline": "Browser-based client-side compute replacing heavy backend microservices for latency-critical apps",
        "velocity_score": 6600,
        "live_rooms": 1,
        "voice_replies": 70,
        "total_pulses": 670,
        "shares": 22,
        "category": "tech",
        "region": "india"
      },
      {
        "tag": "#RoboticsAutomationBharat",
        "headline": "Warehousing and manufacturing plants deploy indigenous autonomous mobile robots",
        "velocity_score": 6450,
        "live_rooms": 1,
        "voice_replies": 65,
        "total_pulses": 630,
        "shares": 20,
        "category": "tech",
        "region": "india"
      },
      {
        "tag": "#DroneDeliveryCorridors",
        "headline": "Civil aviation ministry approves dedicated drone air highways for medicine delivery in hilly regions",
        "velocity_score": 6300,
        "live_rooms": 1,
        "voice_replies": 60,
        "total_pulses": 600,
        "shares": 18,
        "category": "tech",
        "region": "india"
      },
      {
        "tag": "#BatteryTechBreakthrough",
        "headline": "Indian researchers patent sodium-ion battery cells offering 40% cheaper alternative to lithium",
        "velocity_score": 6150,
        "live_rooms": 1,
        "voice_replies": 55,
        "total_pulses": 570,
        "shares": 16,
        "category": "tech",
        "region": "india"
      },
      {
        "tag": "#CloudSovereigntyDebate",
        "headline": "Regulators propose mandatory local storage for all banking and public sector cloud data",
        "velocity_score": 6000,
        "live_rooms": 1,
        "voice_replies": 50,
        "total_pulses": 540,
        "shares": 14,
        "category": "tech",
        "region": "india"
      },
      {
        "tag": "#EdgeAIChips",
        "headline": "Fabless startups design ultra-low-power NPU silicon for smart meters and wearable tech",
        "velocity_score": 5850,
        "live_rooms": 1,
        "voice_replies": 45,
        "total_pulses": 510,
        "shares": 12,
        "category": "tech",
        "region": "india"
      },
      {
        "tag": "#BiometricPaymentTaps",
        "headline": "Palm-vein and facial recognition checkout kiosks debut in major Indian airport terminals",
        "velocity_score": 5700,
        "live_rooms": 1,
        "voice_replies": 40,
        "total_pulses": 480,
        "shares": 10,
        "category": "tech",
        "region": "india"
      },
      {
        "tag": "#CodeReviewAIAssistants",
        "headline": "Engineering leaders assess automated security auditing and test generation accuracy",
        "velocity_score": 5550,
        "live_rooms": 1,
        "voice_replies": 35,
        "total_pulses": 450,
        "shares": 8,
        "category": "tech",
        "region": "india"
      },
      {
        "tag": "#VoiceAIBharat",
        "headline": "Speech-to-speech models achieve human parity in Hindi, Tamil, Telugu, and Bengali dialects",
        "velocity_score": 5400,
        "live_rooms": 1,
        "voice_replies": 30,
        "total_pulses": 420,
        "shares": 6,
        "category": "tech",
        "region": "india"
      },
      {
        "tag": "#GreenDataCenters",
        "headline": "Hyperscalers sign renewable power purchase agreements to power massive Mumbai data parks",
        "velocity_score": 5250,
        "live_rooms": 1,
        "voice_replies": 25,
        "total_pulses": 390,
        "shares": 5,
        "category": "tech",
        "region": "india"
      }
    ],
    "markets": [
      {
        "tag": "#SEBIFnOCrackdown",
        "headline": "Regulator tightens index derivative rules to curb 90% loss rate among retail options traders",
        "velocity_score": 9500,
        "live_rooms": 6,
        "voice_replies": 270,
        "total_pulses": 2100,
        "shares": 140,
        "category": "markets",
        "region": "india"
      },
      {
        "tag": "#Nifty50AllTimeHigh",
        "headline": "Domestic mutual fund SIP inflows surge past record 25,000 crore monthly milestone",
        "velocity_score": 9200,
        "live_rooms": 5,
        "voice_replies": 235,
        "total_pulses": 1840,
        "shares": 120,
        "category": "markets",
        "region": "india"
      },
      {
        "tag": "#AdaniHindenburgReport",
        "headline": "Supreme Court dismisses SIT review as conglomerate posts record quarterly operational profits",
        "velocity_score": 8900,
        "live_rooms": 4,
        "voice_replies": 205,
        "total_pulses": 1650,
        "shares": 105,
        "category": "markets",
        "region": "india"
      },
      {
        "tag": "#GoldPricesSurge",
        "headline": "Gold breaches historic highs in domestic markets as central banks accelerate bullion reserves",
        "velocity_score": 8650,
        "live_rooms": 4,
        "voice_replies": 180,
        "total_pulses": 1490,
        "shares": 90,
        "category": "markets",
        "region": "india"
      },
      {
        "tag": "#BitcoinStrategicReserve",
        "headline": "US legislative proposals for national Bitcoin reserve trigger crypto market rally across global exchanges",
        "velocity_score": 8450,
        "live_rooms": 3,
        "voice_replies": 165,
        "total_pulses": 1380,
        "shares": 80,
        "category": "markets",
        "region": "india"
      },
      {
        "tag": "#RBIInterestRateStance",
        "headline": "Governor maintains withdrawal of accommodation stance citing food inflation volatility",
        "velocity_score": 8250,
        "live_rooms": 3,
        "voice_replies": 150,
        "total_pulses": 1270,
        "shares": 72,
        "category": "markets",
        "region": "india"
      },
      {
        "tag": "#SMEIPOMania",
        "headline": "SEBI investigates fraudulent circular trading and astronomical oversubscription in small-cap listings",
        "velocity_score": 8050,
        "live_rooms": 3,
        "voice_replies": 140,
        "total_pulses": 1180,
        "shares": 65,
        "category": "markets",
        "region": "india"
      },
      {
        "tag": "#RupeeDollarExchange",
        "headline": "Reserve Bank intervenes in currency markets as dollar index strengthens on global macro trends",
        "velocity_score": 7880,
        "live_rooms": 2,
        "voice_replies": 130,
        "total_pulses": 1100,
        "shares": 58,
        "category": "markets",
        "region": "india"
      },
      {
        "tag": "#DIIvsFIIOutflows",
        "headline": "Domestic institutional investors absorb record foreign portfolio selling in Indian equities",
        "velocity_score": 7700,
        "live_rooms": 2,
        "voice_replies": 120,
        "total_pulses": 1020,
        "shares": 52,
        "category": "markets",
        "region": "india"
      },
      {
        "tag": "#DefenceStocksRally",
        "headline": "Public sector shipbuilders and missile makers surge on multi-billion dollar export order books",
        "velocity_score": 7520,
        "live_rooms": 2,
        "voice_replies": 110,
        "total_pulses": 950,
        "shares": 46,
        "category": "markets",
        "region": "india"
      },
      {
        "tag": "#RealEstateREITGrowth",
        "headline": "Commercial office and retail real estate investment trusts offer attractive 7-8% dividend yields",
        "velocity_score": 7350,
        "live_rooms": 2,
        "voice_replies": 100,
        "total_pulses": 890,
        "shares": 40,
        "category": "markets",
        "region": "india"
      },
      {
        "tag": "#AlgoTradingRegulations",
        "headline": "Brokerages implement mandatory co-location API latency disclosure rules for proprietary desks",
        "velocity_score": 7200,
        "live_rooms": 1,
        "voice_replies": 95,
        "total_pulses": 840,
        "shares": 36,
        "category": "markets",
        "region": "india"
      },
      {
        "tag": "#SilverPriceRally",
        "headline": "Industrial demand from solar panel makers and EV battery manufacturers fuels massive silver surge",
        "velocity_score": 7050,
        "live_rooms": 1,
        "voice_replies": 90,
        "total_pulses": 790,
        "shares": 32,
        "category": "markets",
        "region": "india"
      },
      {
        "tag": "#CrudeOilPriceVolatility",
        "headline": "Geopolitical tensions in Middle East shipping lanes cause oil benchmark fluctuations",
        "velocity_score": 6900,
        "live_rooms": 1,
        "voice_replies": 85,
        "total_pulses": 750,
        "shares": 28,
        "category": "markets",
        "region": "india"
      },
      {
        "tag": "#BondYieldSpike",
        "headline": "Ten-year sovereign bond yields react to government borrowing calendar and central bank liquidity",
        "velocity_score": 6750,
        "live_rooms": 1,
        "voice_replies": 80,
        "total_pulses": 710,
        "shares": 25,
        "category": "markets",
        "region": "india"
      },
      {
        "tag": "#BankingNPALowest",
        "headline": "Indian scheduled commercial banks report lowest gross bad loans ratio in over two decades",
        "velocity_score": 6600,
        "live_rooms": 1,
        "voice_replies": 75,
        "total_pulses": 670,
        "shares": 22,
        "category": "markets",
        "region": "india"
      },
      {
        "tag": "#TCSInfyEarningsReview",
        "headline": "IT majors report cautious deal pipeline growth while accelerating generative AI transformation",
        "velocity_score": 6450,
        "live_rooms": 1,
        "voice_replies": 70,
        "total_pulses": 630,
        "shares": 20,
        "category": "markets",
        "region": "india"
      },
      {
        "tag": "#AutoSalesSlowdown",
        "headline": "Automobile dealers association warns of high inventory pile-up in entry-level passenger cars",
        "velocity_score": 6300,
        "live_rooms": 1,
        "voice_replies": 65,
        "total_pulses": 590,
        "shares": 18,
        "category": "markets",
        "region": "india"
      },
      {
        "tag": "#FMCGRuralRecovery",
        "headline": "Consumer goods companies see rebound in rural demand following normal monsoon rainfall",
        "velocity_score": 6150,
        "live_rooms": 1,
        "voice_replies": 60,
        "total_pulses": 560,
        "shares": 15,
        "category": "markets",
        "region": "india"
      },
      {
        "tag": "#PSUBankRerating",
        "headline": "State-run lenders see massive market cap expansion driven by high return on assets and clean balance sheets",
        "velocity_score": 6000,
        "live_rooms": 1,
        "voice_replies": 55,
        "total_pulses": 530,
        "shares": 13,
        "category": "markets",
        "region": "india"
      },
      {
        "tag": "#CleanEnergyIPOs",
        "headline": "Solar and wind independent power producers raise record capital through public listings",
        "velocity_score": 5850,
        "live_rooms": 1,
        "voice_replies": 50,
        "total_pulses": 500,
        "shares": 11,
        "category": "markets",
        "region": "india"
      },
      {
        "tag": "#RetailBrokingPriceWar",
        "headline": "Discount brokers introduce zero brokerage plans for equity delivery and mutual fund purchases",
        "velocity_score": 5700,
        "live_rooms": 1,
        "voice_replies": 45,
        "total_pulses": 470,
        "shares": 9,
        "category": "markets",
        "region": "india"
      },
      {
        "tag": "#MicrofinanceStressAlert",
        "headline": "RBI warns NBFC-MFIs against aggressive over-leveraging of rural women borrowing groups",
        "velocity_score": 5550,
        "live_rooms": 1,
        "voice_replies": 40,
        "total_pulses": 440,
        "shares": 7,
        "category": "markets",
        "region": "india"
      },
      {
        "tag": "#PharmaUSFDAClearances",
        "headline": "Domestic generic manufacturers receive zero-observation inspection reports from US regulator",
        "velocity_score": 5400,
        "live_rooms": 1,
        "voice_replies": 35,
        "total_pulses": 410,
        "shares": 6,
        "category": "markets",
        "region": "india"
      },
      {
        "tag": "#CommoditySupercycle",
        "headline": "Base metals like copper and aluminum rally on global grid expansion and EV infrastructure",
        "velocity_score": 5250,
        "live_rooms": 1,
        "voice_replies": 30,
        "total_pulses": 380,
        "shares": 5,
        "category": "markets",
        "region": "india"
      }
    ],
    "sports": [
      {
        "tag": "#INDvsENG",
        "headline": "India and England clash in high-voltage test series with intense tactical battles on turning tracks",
        "velocity_score": 9750,
        "live_rooms": 7,
        "voice_replies": 310,
        "total_pulses": 2300,
        "shares": 160,
        "category": "sports",
        "region": "india"
      },
      {
        "tag": "#IPL2026AuctionRecords",
        "headline": "Franchises shatter all-time bidding records as marquee fast bowlers and power-hitters cross 25Cr",
        "velocity_score": 9450,
        "live_rooms": 6,
        "voice_replies": 270,
        "total_pulses": 2050,
        "shares": 135,
        "category": "sports",
        "region": "india"
      },
      {
        "tag": "#ChampionsTrophyStandoff",
        "headline": "ICC holds emergency board meetings to resolve venue deadlock between India and Pakistan",
        "velocity_score": 9180,
        "live_rooms": 5,
        "voice_replies": 235,
        "total_pulses": 1820,
        "shares": 115,
        "category": "sports",
        "region": "india"
      },
      {
        "tag": "#RohitSharmaRetirementDebate",
        "headline": "Cricket pundits debate transition timeline for senior legends in ICC test championship cycle",
        "velocity_score": 8900,
        "live_rooms": 4,
        "voice_replies": 205,
        "total_pulses": 1640,
        "shares": 100,
        "category": "sports",
        "region": "india"
      },
      {
        "tag": "#ViratKohliFormWatch",
        "headline": "Star batsman answers critics with masterclass century in overseas conditions",
        "velocity_score": 8700,
        "live_rooms": 4,
        "voice_replies": 190,
        "total_pulses": 1510,
        "shares": 90,
        "category": "sports",
        "region": "india"
      },
      {
        "tag": "#GautamGambhirCoaching",
        "headline": "Aggressive gameplan and intent-first selection policy transforms team India's red-ball template",
        "velocity_score": 8500,
        "live_rooms": 3,
        "voice_replies": 175,
        "total_pulses": 1390,
        "shares": 80,
        "category": "sports",
        "region": "india"
      },
      {
        "tag": "#HardikPandyaRedemption",
        "headline": "All-rounder silences booing crowds with clutch T20 match-winning performances and leadership",
        "velocity_score": 8300,
        "live_rooms": 3,
        "voice_replies": 160,
        "total_pulses": 1280,
        "shares": 72,
        "category": "sports",
        "region": "india"
      },
      {
        "tag": "#BumrahYorkerMasterclass",
        "headline": "Jasprit Bumrah hailed as greatest all-format fast bowler of the modern era after historic five-for",
        "velocity_score": 8100,
        "live_rooms": 3,
        "voice_replies": 145,
        "total_pulses": 1180,
        "shares": 65,
        "category": "sports",
        "region": "india"
      },
      {
        "tag": "#WPL2026Blockbuster",
        "headline": "Women's Premier League draws record stadium attendance and global streaming viewership",
        "velocity_score": 7920,
        "live_rooms": 2,
        "voice_replies": 135,
        "total_pulses": 1090,
        "shares": 58,
        "category": "sports",
        "region": "india"
      },
      {
        "tag": "#NeerajChopraGoldQuest",
        "headline": "Olympic champion breaches 90-meter javelin barrier in Diamond League final",
        "velocity_score": 7750,
        "live_rooms": 2,
        "voice_replies": 125,
        "total_pulses": 1010,
        "shares": 52,
        "category": "sports",
        "region": "india"
      },
      {
        "tag": "#IndiaFootballCoachSearch",
        "headline": "AIFF reviews international manager candidates following disappointing Asian Cup campaign",
        "velocity_score": 7580,
        "live_rooms": 2,
        "voice_replies": 115,
        "total_pulses": 940,
        "shares": 46,
        "category": "sports",
        "region": "india"
      },
      {
        "tag": "#BadmintonThomasCup",
        "headline": "Indian men's badminton squad advances to semifinals with thrilling doubles decider",
        "velocity_score": 7420,
        "live_rooms": 2,
        "voice_replies": 105,
        "total_pulses": 880,
        "shares": 40,
        "category": "sports",
        "region": "india"
      },
      {
        "tag": "#ChessOlympiadChampions",
        "headline": "Indian grandmasters dominate international chess olympiad claiming historic double gold medals",
        "velocity_score": 7250,
        "live_rooms": 2,
        "voice_replies": 95,
        "total_pulses": 820,
        "shares": 36,
        "category": "sports",
        "region": "india"
      },
      {
        "tag": "#ProKabaddiLeagueFever",
        "headline": "High-octane raids and super tackles keep fans on edge in PKL playoffs",
        "velocity_score": 7100,
        "live_rooms": 1,
        "voice_replies": 90,
        "total_pulses": 770,
        "shares": 32,
        "category": "sports",
        "region": "india"
      },
      {
        "tag": "#ShootingWorldCupMedals",
        "headline": "Indian marksmen sweep 10m air pistol and rifle podiums at World Cup stage in Cairo",
        "velocity_score": 6950,
        "live_rooms": 1,
        "voice_replies": 85,
        "total_pulses": 730,
        "shares": 28,
        "category": "sports",
        "region": "india"
      },
      {
        "tag": "#HockeyIndiaLeagueReturn",
        "headline": "Revamped HIL franchise auction attracts top international Olympic stars to India",
        "velocity_score": 6800,
        "live_rooms": 1,
        "voice_replies": 80,
        "total_pulses": 690,
        "shares": 25,
        "category": "sports",
        "region": "india"
      },
      {
        "tag": "#WrestlingTrialsDrama",
        "headline": "Young challengers upset veteran medalists in fiery national championship bouts",
        "velocity_score": 6650,
        "live_rooms": 1,
        "voice_replies": 75,
        "total_pulses": 650,
        "shares": 22,
        "category": "sports",
        "region": "india"
      },
      {
        "tag": "#RishabhPantComeback",
        "headline": "Wicketkeeper batsman's miraculous recovery and counter-attacking centuries inspire cricket world",
        "velocity_score": 6500,
        "live_rooms": 1,
        "voice_replies": 70,
        "total_pulses": 610,
        "shares": 19,
        "category": "sports",
        "region": "india"
      },
      {
        "tag": "#TableTennisSmashHit",
        "headline": "Manika Batra and Sreeja Akula break into global top-20 world rankings",
        "velocity_score": 6350,
        "live_rooms": 1,
        "voice_replies": 65,
        "total_pulses": 580,
        "shares": 16,
        "category": "sports",
        "region": "india"
      },
      {
        "tag": "#F1IndianGrandPrixHopes",
        "headline": "Motorsport federation explores revival of Buddh International Circuit for international racing",
        "velocity_score": 6200,
        "live_rooms": 1,
        "voice_replies": 60,
        "total_pulses": 550,
        "shares": 14,
        "category": "sports",
        "region": "india"
      },
      {
        "tag": "#BoxingWorldChampionships",
        "headline": "Indian pugilists secure multi-medal haul in high-intensity finals in Tashkent",
        "velocity_score": 6050,
        "live_rooms": 1,
        "voice_replies": 55,
        "total_pulses": 520,
        "shares": 12,
        "category": "sports",
        "region": "india"
      },
      {
        "tag": "#IndianArcheryDominance",
        "headline": "Compound archery trio clinches world cup gold with near-perfect 10-ring scorecards",
        "velocity_score": 5900,
        "live_rooms": 1,
        "voice_replies": 50,
        "total_pulses": 490,
        "shares": 10,
        "category": "sports",
        "region": "india"
      },
      {
        "tag": "#TennisDavisCupClash",
        "headline": "Indian doubles duo battles through five-set thriller in world group playoff tie",
        "velocity_score": 5750,
        "live_rooms": 1,
        "voice_replies": 45,
        "total_pulses": 460,
        "shares": 8,
        "category": "sports",
        "region": "india"
      },
      {
        "tag": "#AthleticsDiamondLeague",
        "headline": "Indian steeplechase and 4x400m relay runners clock historic national record timings",
        "velocity_score": 5600,
        "live_rooms": 1,
        "voice_replies": 40,
        "total_pulses": 430,
        "shares": 6,
        "category": "sports",
        "region": "india"
      },
      {
        "tag": "#EsportsIndiaRise",
        "headline": "Indian mobile esports squads qualify for international multi-million dollar championship finals",
        "velocity_score": 5450,
        "live_rooms": 1,
        "voice_replies": 35,
        "total_pulses": 400,
        "shares": 5,
        "category": "sports",
        "region": "india"
      }
    ],
    "startup": [
      {
        "tag": "#ZeptoVsBlinkit",
        "headline": "Quick commerce giants raise mega rounds at $5B+ valuations to expand dark store networks nationwide",
        "velocity_score": 9600,
        "live_rooms": 6,
        "voice_replies": 280,
        "total_pulses": 2150,
        "shares": 145,
        "category": "startup",
        "region": "india"
      },
      {
        "tag": "#ByjusCreditorWar",
        "headline": "US lenders and Indian insolvency resolution professional clash over control of remaining assets",
        "velocity_score": 9300,
        "live_rooms": 5,
        "voice_replies": 245,
        "total_pulses": 1880,
        "shares": 125,
        "category": "startup",
        "region": "india"
      },
      {
        "tag": "#70HourWorkWeekDebate",
        "headline": "Founders defend relentless hustle while engineers demand strict boundaries and equity compensation",
        "velocity_score": 9050,
        "live_rooms": 4,
        "voice_replies": 215,
        "total_pulses": 1690,
        "shares": 110,
        "category": "startup",
        "region": "india"
      },
      {
        "tag": "#OlaServiceCrisis",
        "headline": "Bhavish Aggarwal responds to customer service backlog as CCPA audits EV warranty claims",
        "velocity_score": 8800,
        "live_rooms": 4,
        "voice_replies": 190,
        "total_pulses": 1520,
        "shares": 95,
        "category": "startup",
        "region": "india"
      },
      {
        "tag": "#ReverseFlippingTrend",
        "headline": "Unicorns move domicile back to India from US and Singapore ahead of domestic IPO filings",
        "velocity_score": 8600,
        "live_rooms": 3,
        "voice_replies": 175,
        "total_pulses": 1390,
        "shares": 85,
        "category": "startup",
        "region": "india"
      },
      {
        "tag": "#VCWinterVsAIHype",
        "headline": "Seed capital dries up for generic SaaS while vertical AI and physical tech startups bag massive checks",
        "velocity_score": 8400,
        "live_rooms": 3,
        "voice_replies": 160,
        "total_pulses": 1290,
        "shares": 75,
        "category": "startup",
        "region": "india"
      },
      {
        "tag": "#KiranaStoreDefense",
        "headline": "Retail trade bodies demand minimum price regulations on quick commerce predatory discounting",
        "velocity_score": 8200,
        "live_rooms": 3,
        "voice_replies": 145,
        "total_pulses": 1190,
        "shares": 68,
        "category": "startup",
        "region": "india"
      },
      {
        "tag": "#FounderFraudAudit",
        "headline": "Forensic auditing firms uncover inflated revenue numbers and related-party transactions in early-stage startups",
        "velocity_score": 8000,
        "live_rooms": 2,
        "voice_replies": 135,
        "total_pulses": 1100,
        "shares": 60,
        "category": "startup",
        "region": "india"
      },
      {
        "tag": "#SwiggyIPOListing",
        "headline": "Food delivery giant debuts on public bourses with high institutional anchor investor demand",
        "velocity_score": 7820,
        "live_rooms": 2,
        "voice_replies": 125,
        "total_pulses": 1020,
        "shares": 52,
        "category": "startup",
        "region": "india"
      },
      {
        "tag": "#Tier2StartupSurge",
        "headline": "Founders in Jaipur, Kochi, Indore, and Ahmedabad build profitable bootstrapped businesses",
        "velocity_score": 7650,
        "live_rooms": 2,
        "voice_replies": 115,
        "total_pulses": 950,
        "shares": 46,
        "category": "startup",
        "region": "india"
      },
      {
        "tag": "#EdtechPivotToOffline",
        "headline": "Online learning companies open hybrid physical tuition centers to survive slowing digital renewals",
        "velocity_score": 7480,
        "live_rooms": 2,
        "voice_replies": 105,
        "total_pulses": 890,
        "shares": 40,
        "category": "startup",
        "region": "india"
      },
      {
        "tag": "#D2CBrandsAcquisition",
        "headline": "FMCG conglomerates acquire clean-label food and personal care direct-to-consumer brands",
        "velocity_score": 7320,
        "live_rooms": 2,
        "voice_replies": 95,
        "total_pulses": 830,
        "shares": 35,
        "category": "startup",
        "region": "india"
      },
      {
        "tag": "#FintechLendingGuidelines",
        "headline": "RBI limits default loss guarantees forcing peer-to-peer and buy-now-pay-later platforms to pivot",
        "velocity_score": 7150,
        "live_rooms": 1,
        "voice_replies": 90,
        "total_pulses": 780,
        "shares": 30,
        "category": "startup",
        "region": "india"
      },
      {
        "tag": "#SpaceTechStartupsIndia",
        "headline": "Private launch vehicle and earth observation satellite makers raise Series B venture funds",
        "velocity_score": 6980,
        "live_rooms": 1,
        "voice_replies": 85,
        "total_pulses": 730,
        "shares": 26,
        "category": "startup",
        "region": "india"
      },
      {
        "tag": "#AgritechSupplyChain",
        "headline": "Farm-to-fork logistics startups eliminate middlemen to provide direct fair prices to vegetable growers",
        "velocity_score": 6820,
        "live_rooms": 1,
        "voice_replies": 80,
        "total_pulses": 690,
        "shares": 22,
        "category": "startup",
        "region": "india"
      },
      {
        "tag": "#HealthtechAIBreakthrough",
        "headline": "Diagnostic AI startups build chest X-ray and retinal scan algorithms for rural primary health centers",
        "velocity_score": 6650,
        "live_rooms": 1,
        "voice_replies": 75,
        "total_pulses": 650,
        "shares": 19,
        "category": "startup",
        "region": "india"
      },
      {
        "tag": "#EVBatterySwappingNetwork",
        "headline": "Two-wheeler commercial delivery fleets adopt standardized battery swap stations in top metros",
        "velocity_score": 6500,
        "live_rooms": 1,
        "voice_replies": 70,
        "total_pulses": 610,
        "shares": 16,
        "category": "startup",
        "region": "india"
      },
      {
        "tag": "#B2BECommerceProfitability",
        "headline": "Wholesale raw material and industrial goods platforms reach positive unit economics",
        "velocity_score": 6350,
        "live_rooms": 1,
        "voice_replies": 65,
        "total_pulses": 570,
        "shares": 14,
        "category": "startup",
        "region": "india"
      },
      {
        "tag": "#GamingStudioFunding",
        "headline": "Indian indie game developers secure international publishing deals for PC and console titles",
        "velocity_score": 6200,
        "live_rooms": 1,
        "voice_replies": 60,
        "total_pulses": 540,
        "shares": 12,
        "category": "startup",
        "region": "india"
      },
      {
        "tag": "#DeeptechPatentFiling",
        "headline": "Indian university incubators report 300% surge in hardware and bio-engineering patent applications",
        "velocity_score": 6050,
        "live_rooms": 1,
        "voice_replies": 55,
        "total_pulses": 510,
        "shares": 10,
        "category": "startup",
        "region": "india"
      },
      {
        "tag": "#DarkStoreRealEstate",
        "headline": "Commercial warehouse rents spike in residential neighborhoods as instant delivery hubs expand",
        "velocity_score": 5900,
        "live_rooms": 1,
        "voice_replies": 50,
        "total_pulses": 480,
        "shares": 8,
        "category": "startup",
        "region": "india"
      },
      {
        "tag": "#ClimateTechCarbonCredits",
        "headline": "Startups build satellite-verified regenerative agriculture and soil carbon credit platforms",
        "velocity_score": 5750,
        "live_rooms": 1,
        "voice_replies": 45,
        "total_pulses": 450,
        "shares": 7,
        "category": "startup",
        "region": "india"
      },
      {
        "tag": "#HRTechSalaryTransparency",
        "headline": "Recruitment platforms introduce mandatory salary ranges on job postings to attract top talent",
        "velocity_score": 5600,
        "live_rooms": 1,
        "voice_replies": 40,
        "total_pulses": 420,
        "shares": 6,
        "category": "startup",
        "region": "india"
      },
      {
        "tag": "#DroneLogisticsStartups",
        "headline": "Heavy-payload cargo drones complete autonomous cross-valley delivery trials in Himachal Pradesh",
        "velocity_score": 5450,
        "live_rooms": 1,
        "voice_replies": 35,
        "total_pulses": 390,
        "shares": 5,
        "category": "startup",
        "region": "india"
      },
      {
        "tag": "#GIFT\u8a00CityFintechHub",
        "headline": "Cross-border payment innovators set up offshore banking units under unified regulatory sandbox",
        "velocity_score": 5300,
        "live_rooms": 1,
        "voice_replies": 30,
        "total_pulses": 360,
        "shares": 4,
        "category": "startup",
        "region": "india"
      }
    ],
    "entertainment": [
      {
        "tag": "#BollywoodVsSouth",
        "headline": "Pan-India blockbusters redefine box office dominance as regional cinema outpaces traditional Bollywood",
        "velocity_score": 9650,
        "live_rooms": 6,
        "voice_replies": 290,
        "total_pulses": 2200,
        "shares": 150,
        "category": "entertainment",
        "region": "india"
      },
      {
        "tag": "#OTTCensorshipDebate",
        "headline": "Filmmakers express alarm over proposed broadcast bill requiring pre-screening of web series content",
        "velocity_score": 9350,
        "live_rooms": 5,
        "voice_replies": 250,
        "total_pulses": 1920,
        "shares": 130,
        "category": "entertainment",
        "region": "india"
      },
      {
        "tag": "#Stree2BoxOfficeStorm",
        "headline": "Horror-comedy sequel breaks historic domestic collection records proving content over star power",
        "velocity_score": 9100,
        "live_rooms": 5,
        "voice_replies": 225,
        "total_pulses": 1750,
        "shares": 115,
        "category": "entertainment",
        "region": "india"
      },
      {
        "tag": "#NepotismDebateRenewed",
        "headline": "Star kids casting in big-budget historicals triggers fresh wave of social media backlash",
        "velocity_score": 8850,
        "live_rooms": 4,
        "voice_replies": 200,
        "total_pulses": 1580,
        "shares": 100,
        "category": "entertainment",
        "region": "india"
      },
      {
        "tag": "#PVRPopcornPricing",
        "headline": "Multiplex association defends food and beverage tariffs as audiences demand ticket price reductions",
        "velocity_score": 8600,
        "live_rooms": 4,
        "voice_replies": 180,
        "total_pulses": 1430,
        "shares": 85,
        "category": "entertainment",
        "region": "india"
      },
      {
        "tag": "#CelebrityPRStunts",
        "headline": "Insiders expose staged airport paparazzi shoots and manufactured relationship rumors",
        "velocity_score": 8400,
        "live_rooms": 3,
        "voice_replies": 165,
        "total_pulses": 1310,
        "shares": 75,
        "category": "entertainment",
        "region": "india"
      },
      {
        "tag": "#SouthCinemaRemakesFail",
        "headline": "Bollywood producers move away from official remakes after string of poor box office returns",
        "velocity_score": 8200,
        "live_rooms": 3,
        "voice_replies": 150,
        "total_pulses": 1210,
        "shares": 68,
        "category": "entertainment",
        "region": "india"
      },
      {
        "tag": "#NationalFilmAwardsDebate",
        "headline": "Critics and cinephiles debate jury choices in feature film and acting categories",
        "velocity_score": 8000,
        "live_rooms": 2,
        "voice_replies": 135,
        "total_pulses": 1120,
        "shares": 60,
        "category": "entertainment",
        "region": "india"
      },
      {
        "tag": "#StreamingWarIndia",
        "headline": "JioCinema, Netflix, and Prime Video slash subscription prices in fierce subscriber battle",
        "velocity_score": 7820,
        "live_rooms": 2,
        "voice_replies": 125,
        "total_pulses": 1040,
        "shares": 52,
        "category": "entertainment",
        "region": "india"
      },
      {
        "tag": "#VFXQualityBacklash",
        "headline": "Audiences call out shoddy CGI in big-budget mythological films demanding higher artistic standards",
        "velocity_score": 7650,
        "live_rooms": 2,
        "voice_replies": 115,
        "total_pulses": 970,
        "shares": 46,
        "category": "entertainment",
        "region": "india"
      },
      {
        "tag": "#IndependentCinemaRevival",
        "headline": "Film festival darlings like 'All We Imagine As Light' achieve international critical acclaim",
        "velocity_score": 7480,
        "live_rooms": 2,
        "voice_replies": 105,
        "total_pulses": 900,
        "shares": 40,
        "category": "entertainment",
        "region": "india"
      },
      {
        "tag": "#RealityShowDrama",
        "headline": "Bigg Boss controversies reach fever pitch as contestants clash over live streaming tasks",
        "velocity_score": 7320,
        "live_rooms": 2,
        "voice_replies": 95,
        "total_pulses": 840,
        "shares": 35,
        "category": "entertainment",
        "region": "india"
      },
      {
        "tag": "#SuperstarSalaryCuts",
        "headline": "Producers demand top actors take profit-sharing models over massive upfront fees",
        "velocity_score": 7150,
        "live_rooms": 1,
        "voice_replies": 90,
        "total_pulses": 790,
        "shares": 30,
        "category": "entertainment",
        "region": "india"
      },
      {
        "tag": "#AnimeCrazeIndia",
        "headline": "Theatrical releases of Japanese anime blockbusters sell out IMAX theaters across Indian cities",
        "velocity_score": 6980,
        "live_rooms": 1,
        "voice_replies": 85,
        "total_pulses": 740,
        "shares": 26,
        "category": "entertainment",
        "region": "india"
      },
      {
        "tag": "#TheatreScreenClosures",
        "headline": "Single-screen theatre owners appeal for government relief packages as operating costs rise",
        "velocity_score": 6820,
        "live_rooms": 1,
        "voice_replies": 80,
        "total_pulses": 700,
        "shares": 22,
        "category": "entertainment",
        "region": "india"
      },
      {
        "tag": "#DocuseriesTrueCrime",
        "headline": "Indian true crime investigative series top global non-English streaming charts",
        "velocity_score": 6650,
        "live_rooms": 1,
        "voice_replies": 75,
        "total_pulses": 660,
        "shares": 19,
        "category": "entertainment",
        "region": "india"
      },
      {
        "tag": "#KPopFandomBharat",
        "headline": "K-Pop idol world tours announce maiden India stadium concerts sparking frenzy",
        "velocity_score": 6500,
        "live_rooms": 1,
        "voice_replies": 70,
        "total_pulses": 620,
        "shares": 16,
        "category": "entertainment",
        "region": "india"
      },
      {
        "tag": "#StandupComedyBans",
        "headline": "Comedians navigate venue cancellations and FIR threats over satirical political sets",
        "velocity_score": 6350,
        "live_rooms": 1,
        "voice_replies": 65,
        "total_pulses": 580,
        "shares": 14,
        "category": "entertainment",
        "region": "india"
      },
      {
        "tag": "#HollywoodFatigueIndia",
        "headline": "Superhero franchise sequels struggle at Indian box office against strong local content",
        "velocity_score": 6200,
        "live_rooms": 1,
        "voice_replies": 60,
        "total_pulses": 540,
        "shares": 12,
        "category": "entertainment",
        "region": "india"
      },
      {
        "tag": "#CelebrityPodcastBoom",
        "headline": "Long-form candid video podcasts replace traditional television talk shows",
        "velocity_score": 6050,
        "live_rooms": 1,
        "voice_replies": 55,
        "total_pulses": 510,
        "shares": 10,
        "category": "entertainment",
        "region": "india"
      },
      {
        "tag": "#RegionalOTTPlatforms",
        "headline": "Aha, Hoichoi, and Planet Marathi report record subscriber growth with hyperlocal storytelling",
        "velocity_score": 5900,
        "live_rooms": 1,
        "voice_replies": 50,
        "total_pulses": 480,
        "shares": 8,
        "category": "entertainment",
        "region": "india"
      },
      {
        "tag": "#ChildActorProtection",
        "headline": "Child rights commission issues strict working hour guidelines for television reality sets",
        "velocity_score": 5750,
        "live_rooms": 1,
        "voice_replies": 45,
        "total_pulses": 450,
        "shares": 7,
        "category": "entertainment",
        "region": "india"
      },
      {
        "tag": "#AIInScriptwriting",
        "headline": "Screenwriters association demands contract clauses prohibiting AI-generated screenplays",
        "velocity_score": 5600,
        "live_rooms": 1,
        "voice_replies": 40,
        "total_pulses": 420,
        "shares": 6,
        "category": "entertainment",
        "region": "india"
      },
      {
        "tag": "#IMAXScreenExpansion",
        "headline": "Premium large format cinema screens witness record occupancy for Hollywood and South tentpoles",
        "velocity_score": 5450,
        "live_rooms": 1,
        "voice_replies": 35,
        "total_pulses": 390,
        "shares": 5,
        "category": "entertainment",
        "region": "india"
      },
      {
        "tag": "#FilmPreservationMission",
        "headline": "National film archives restore century-old silent classics in 4K resolution",
        "velocity_score": 5300,
        "live_rooms": 1,
        "voice_replies": 30,
        "total_pulses": 360,
        "shares": 4,
        "category": "entertainment",
        "region": "india"
      }
    ],
    "music": [
      {
        "tag": "#DiljitConcertScalping",
        "headline": "Dil-Luminati stadium tour tickets resold at exorbitant prices prompting consumer protection probes",
        "velocity_score": 9700,
        "live_rooms": 7,
        "voice_replies": 310,
        "total_pulses": 2300,
        "shares": 160,
        "category": "music",
        "region": "india"
      },
      {
        "tag": "#ArijitSinghAutotune",
        "headline": "Playback king criticizes excessive vocal processing in commercial tracks and champions raw acoustic authenticity",
        "velocity_score": 9400,
        "live_rooms": 6,
        "voice_replies": 270,
        "total_pulses": 2020,
        "shares": 135,
        "category": "music",
        "region": "india"
      },
      {
        "tag": "#DesiHipHopBeef",
        "headline": "Top rap artists exchange brutal multi-verse diss tracks breaking real-time streaming records",
        "velocity_score": 9150,
        "live_rooms": 5,
        "voice_replies": 240,
        "total_pulses": 1810,
        "shares": 120,
        "category": "music",
        "region": "india"
      },
      {
        "tag": "#CokeStudioBharat3",
        "headline": "Modular synth producers and folk sarangi maestros collaborate on boundary-pushing raga tracks",
        "velocity_score": 8900,
        "live_rooms": 4,
        "voice_replies": 210,
        "total_pulses": 1630,
        "shares": 105,
        "category": "music",
        "region": "india"
      },
      {
        "tag": "#IndieMusicStreamingSurge",
        "headline": "Non-film indie musicians record 150% streaming revenue surge on independent DSP distributors",
        "velocity_score": 8650,
        "live_rooms": 4,
        "voice_replies": 185,
        "total_pulses": 1470,
        "shares": 90,
        "category": "music",
        "region": "india"
      },
      {
        "tag": "#AIVoiceCloningScandal",
        "headline": "Music labels issue cease-and-desist notices to platforms hosting unauthorized vocal clones of deceased legends",
        "velocity_score": 8450,
        "live_rooms": 3,
        "voice_replies": 165,
        "total_pulses": 1340,
        "shares": 78,
        "category": "music",
        "region": "india"
      },
      {
        "tag": "#SpotifyRoyaltyPayouts",
        "headline": "Indie artists demand fair per-stream payouts following Spotify's 1,000-stream qualification rule",
        "velocity_score": 8250,
        "live_rooms": 3,
        "voice_replies": 150,
        "total_pulses": 1230,
        "shares": 70,
        "category": "music",
        "region": "india"
      },
      {
        "tag": "#ColdplayMumbaiConcert",
        "headline": "Music Of The Spheres stadium shows trigger historic digital ticket queue of 13 million fans",
        "velocity_score": 8050,
        "live_rooms": 3,
        "voice_replies": 140,
        "total_pulses": 1140,
        "shares": 62,
        "category": "music",
        "region": "india"
      },
      {
        "tag": "#PunjabiMusicGlobalRise",
        "headline": "Punjabi drill and trap records top UK and Canadian mainstream charts",
        "velocity_score": 7880,
        "live_rooms": 2,
        "voice_replies": 130,
        "total_pulses": 1060,
        "shares": 55,
        "category": "music",
        "region": "india"
      },
      {
        "tag": "#GhostProducerControversy",
        "headline": "Expose reveals uncredited sound engineers behind viral electronic chart-toppers",
        "velocity_score": 7700,
        "live_rooms": 2,
        "voice_replies": 120,
        "total_pulses": 990,
        "shares": 48,
        "category": "music",
        "region": "india"
      },
      {
        "tag": "#CarnaticFusionElectronic",
        "headline": "Bangalore producers blend ancient 22-shruti scales with analog Eurorack modular synthesizers",
        "velocity_score": 7520,
        "live_rooms": 2,
        "voice_replies": 110,
        "total_pulses": 930,
        "shares": 42,
        "category": "music",
        "region": "india"
      },
      {
        "tag": "#MusicLabelMonopoly",
        "headline": "Independent songwriters protest 360-degree contracts locking audio publishing rights for decades",
        "velocity_score": 7350,
        "live_rooms": 2,
        "voice_replies": 100,
        "total_pulses": 870,
        "shares": 38,
        "category": "music",
        "region": "india"
      },
      {
        "tag": "#SufiRockResurgence",
        "headline": "Live band revival sees sold-out campus tours across northern and western states",
        "velocity_score": 7200,
        "live_rooms": 1,
        "voice_replies": 95,
        "total_pulses": 820,
        "shares": 34,
        "category": "music",
        "region": "india"
      },
      {
        "tag": "#SpatialAudioMastering",
        "headline": "Indian sound designers embrace Dolby Atmos for immersive devotional and cinema mixes",
        "velocity_score": 7050,
        "live_rooms": 1,
        "voice_replies": 90,
        "total_pulses": 770,
        "shares": 30,
        "category": "music",
        "region": "india"
      },
      {
        "tag": "#VinylRecordsRenaissance",
        "headline": "Collectors fuel massive demand for classic RD Burman and AR Rahman vinyl pressings",
        "velocity_score": 6900,
        "live_rooms": 1,
        "voice_replies": 85,
        "total_pulses": 730,
        "shares": 26,
        "category": "music",
        "region": "india"
      },
      {
        "tag": "#FolkMusicPreservation",
        "headline": "Field recording archivists document dying Rajasthani and Baul acoustic traditions",
        "velocity_score": 6750,
        "live_rooms": 1,
        "voice_replies": 80,
        "total_pulses": 690,
        "shares": 22,
        "category": "music",
        "region": "india"
      },
      {
        "tag": "#MusicFestivalSafety",
        "headline": "Organizers mandate strict acoustic decibel caps and crowd control barriers for winter music fests",
        "velocity_score": 6600,
        "live_rooms": 1,
        "voice_replies": 75,
        "total_pulses": 650,
        "shares": 19,
        "category": "music",
        "region": "india"
      },
      {
        "tag": "#LoFiBollywoodBeats",
        "headline": "Bedroom producers amass millions of global streams with chilled nostalgic Hindi remixes",
        "velocity_score": 6450,
        "live_rooms": 1,
        "voice_replies": 70,
        "total_pulses": 610,
        "shares": 16,
        "category": "music",
        "region": "india"
      },
      {
        "tag": "#FilmScoreMastery",
        "headline": "Cinematic orchestral composers record live symphony sessions in Budapest for Indian epics",
        "velocity_score": 6300,
        "live_rooms": 1,
        "voice_replies": 65,
        "total_pulses": 570,
        "shares": 14,
        "category": "music",
        "region": "india"
      },
      {
        "tag": "#KashmirIndieScene",
        "headline": "Young poets and acoustic guitarists build vibrant underground music movement in Srinagar",
        "velocity_score": 6150,
        "live_rooms": 1,
        "voice_replies": 60,
        "total_pulses": 540,
        "shares": 12,
        "category": "music",
        "region": "india"
      },
      {
        "tag": "#AcousticMicrotonalGuitars",
        "headline": "Luthiers build custom fretted guitars capable of sliding microtones for Indian ragas",
        "velocity_score": 6000,
        "live_rooms": 1,
        "voice_replies": 55,
        "total_pulses": 510,
        "shares": 10,
        "category": "music",
        "region": "india"
      },
      {
        "tag": "#IndependentRappersUnion",
        "headline": "Street cypher collectives form self-publishing syndicates to bypass predatory label deals",
        "velocity_score": 5850,
        "live_rooms": 1,
        "voice_replies": 50,
        "total_pulses": 480,
        "shares": 8,
        "category": "music",
        "region": "india"
      },
      {
        "tag": "#PodcastAudioDrama",
        "headline": "High-fidelity audio fictional universes and thriller series attract major brand sponsorships",
        "velocity_score": 5700,
        "live_rooms": 1,
        "voice_replies": 45,
        "total_pulses": 450,
        "shares": 7,
        "category": "music",
        "region": "india"
      },
      {
        "tag": "#SanskritChantsElectronic",
        "headline": "Meditative ambient drone and Vedic mantra collaborations find massive European wellness following",
        "velocity_score": 5550,
        "live_rooms": 1,
        "voice_replies": 40,
        "total_pulses": 420,
        "shares": 6,
        "category": "music",
        "region": "india"
      },
      {
        "tag": "#BassMusicIndiaTour",
        "headline": "International drum and bass and dubstep producers perform across underground club circuits",
        "velocity_score": 5400,
        "live_rooms": 1,
        "voice_replies": 35,
        "total_pulses": 390,
        "shares": 5,
        "category": "music",
        "region": "india"
      }
    ]
  },
  "world": {
    "trending": [
      {
        "tag": "#OpenAIClosedSourceWar",
        "headline": "Elon Musk expands federal lawsuit against OpenAI over non-profit charter abandonment and commercial restructuring",
        "velocity_score": 9950,
        "live_rooms": 8,
        "voice_replies": 350,
        "total_pulses": 2800,
        "shares": 210,
        "category": "trending",
        "region": "world"
      },
      {
        "tag": "#DeepSeekAIChallenge",
        "headline": "China's open-weights DeepSeek R1 outperforms proprietary US frontier models at a fraction of training compute",
        "velocity_score": 9780,
        "live_rooms": 7,
        "voice_replies": 320,
        "total_pulses": 2500,
        "shares": 190,
        "category": "trending",
        "region": "world"
      },
      {
        "tag": "#Bitcoin100KDebate",
        "headline": "Bitcoin crosses historic $100k valuation as nation-states debate sovereign cryptocurrency strategic reserves",
        "velocity_score": 9550,
        "live_rooms": 6,
        "voice_replies": 290,
        "total_pulses": 2250,
        "shares": 165,
        "category": "trending",
        "region": "world"
      },
      {
        "tag": "#TikTokBanStandoff",
        "headline": "Federal appellate court ruling on ByteDance divestment deadline sets stage for Supreme Court showdown",
        "velocity_score": 9320,
        "live_rooms": 5,
        "voice_replies": 260,
        "total_pulses": 2010,
        "shares": 145,
        "category": "trending",
        "region": "world"
      },
      {
        "tag": "#USNationalTariffs",
        "headline": "Proposed universal tariffs on global trading partners trigger inflation warnings and supply chain recalculations",
        "velocity_score": 9100,
        "live_rooms": 5,
        "voice_replies": 235,
        "total_pulses": 1820,
        "shares": 130,
        "category": "trending",
        "region": "world"
      },
      {
        "tag": "#NvidiaAntitrustProbe",
        "headline": "Department of Justice launches formal investigation into Nvidia AI chip bundling and networking contracts",
        "velocity_score": 8900,
        "live_rooms": 4,
        "voice_replies": 210,
        "total_pulses": 1650,
        "shares": 115,
        "category": "trending",
        "region": "world"
      },
      {
        "tag": "#DrakeKendrickFeud",
        "headline": "Grammy-winning diss tracks spark legal copyright and defamation disputes between record labels",
        "velocity_score": 8720,
        "live_rooms": 4,
        "voice_replies": 190,
        "total_pulses": 1510,
        "shares": 100,
        "category": "trending",
        "region": "world"
      },
      {
        "tag": "#BigTechLayoffs2026",
        "headline": "Silicon Valley giants cut thousands of administrative roles while directing record capital into data centers",
        "velocity_score": 8550,
        "live_rooms": 3,
        "voice_replies": 175,
        "total_pulses": 1390,
        "shares": 88,
        "category": "trending",
        "region": "world"
      },
      {
        "tag": "#MiddleEastCorridorCrisis",
        "headline": "Red Sea maritime security operations escalate as container shipping rates spike globally",
        "velocity_score": 8380,
        "live_rooms": 3,
        "voice_replies": 160,
        "total_pulses": 1280,
        "shares": 78,
        "category": "trending",
        "region": "world"
      },
      {
        "tag": "#AppleIntelligenceEUFines",
        "headline": "European regulators threaten massive DMA penalties over delayed AI feature deployment and browser choice",
        "velocity_score": 8200,
        "live_rooms": 3,
        "voice_replies": 145,
        "total_pulses": 1180,
        "shares": 70,
        "category": "trending",
        "region": "world"
      },
      {
        "tag": "#BRICSDedollarization",
        "headline": "Emerging economies establish independent bilateral currency settlement system to reduce USD reliance",
        "velocity_score": 8020,
        "live_rooms": 3,
        "voice_replies": 135,
        "total_pulses": 1090,
        "shares": 62,
        "category": "trending",
        "region": "world"
      },
      {
        "tag": "#CrowdStrikeKernelBan",
        "headline": "Microsoft plans to restrict security vendors from ring-0 kernel-level access following Windows crash",
        "velocity_score": 7850,
        "live_rooms": 2,
        "voice_replies": 125,
        "total_pulses": 1010,
        "shares": 55,
        "category": "trending",
        "region": "world"
      },
      {
        "tag": "#SpaceXStarshipOrbital",
        "headline": "Giant Starship booster caught mid-air by mechanical launch tower arms in historic aerospace feat",
        "velocity_score": 7690,
        "live_rooms": 2,
        "voice_replies": 115,
        "total_pulses": 940,
        "shares": 48,
        "category": "trending",
        "region": "world"
      },
      {
        "tag": "#UniversalMusicVsAIMusic",
        "headline": "UMG files billion-dollar copyright infringement lawsuit against AI song generators Suno and Udio",
        "velocity_score": 7520,
        "live_rooms": 2,
        "voice_replies": 105,
        "total_pulses": 880,
        "shares": 42,
        "category": "trending",
        "region": "world"
      },
      {
        "tag": "#GlobalSemiconductorSanctions",
        "headline": "Expanded export controls restrict advanced lithography tools and HBM memory shipments to China",
        "velocity_score": 7380,
        "live_rooms": 2,
        "voice_replies": 98,
        "total_pulses": 820,
        "shares": 38,
        "category": "trending",
        "region": "world"
      },
      {
        "tag": "#NuclearPoweredDataCenters",
        "headline": "Tech titans sign multi-gigawatt power contracts with small modular nuclear reactor developers",
        "velocity_score": 7240,
        "live_rooms": 2,
        "voice_replies": 90,
        "total_pulses": 770,
        "shares": 34,
        "category": "trending",
        "region": "world"
      },
      {
        "tag": "#FootballVARControversy",
        "headline": "Premier League and Champions League referees face intense scrutiny over automated offside technology",
        "velocity_score": 7100,
        "live_rooms": 1,
        "voice_replies": 85,
        "total_pulses": 720,
        "shares": 30,
        "category": "trending",
        "region": "world"
      },
      {
        "tag": "#GlobalGoldReserveSurge",
        "headline": "Central banks purchase record gold bullion as geopolitical hedging accelerates",
        "velocity_score": 6950,
        "live_rooms": 1,
        "voice_replies": 80,
        "total_pulses": 680,
        "shares": 26,
        "category": "trending",
        "region": "world"
      },
      {
        "tag": "#AutonomousRobotaxisDebate",
        "headline": "Waymo and Baidu expand driverless commercial fleet testing amid municipal safety pushback",
        "velocity_score": 6800,
        "live_rooms": 1,
        "voice_replies": 75,
        "total_pulses": 640,
        "shares": 22,
        "category": "trending",
        "region": "world"
      },
      {
        "tag": "#QuantumDecryptionThreat",
        "headline": "NIST finalizes post-quantum cryptographic standards to protect global financial encryption",
        "velocity_score": 6650,
        "live_rooms": 1,
        "voice_replies": 70,
        "total_pulses": 600,
        "shares": 19,
        "category": "trending",
        "region": "world"
      },
      {
        "tag": "#OasisReunionTicketFiasco",
        "headline": "Dynamic pricing algorithm pushes ticket prices to thousands prompting UK competition probe",
        "velocity_score": 6500,
        "live_rooms": 1,
        "voice_replies": 65,
        "total_pulses": 570,
        "shares": 16,
        "category": "trending",
        "region": "world"
      },
      {
        "tag": "#ElClasicoRefereeRow",
        "headline": "La Liga title race heated as controversial penalty calls spark explosive post-match press conferences",
        "velocity_score": 6350,
        "live_rooms": 1,
        "voice_replies": 60,
        "total_pulses": 540,
        "shares": 14,
        "category": "trending",
        "region": "world"
      },
      {
        "tag": "#DeepfakeElectionsAlarm",
        "headline": "Intelligence agencies detect coordinated synthetic audio dispatches in international election campaigns",
        "velocity_score": 6200,
        "live_rooms": 1,
        "voice_replies": 55,
        "total_pulses": 510,
        "shares": 12,
        "category": "trending",
        "region": "world"
      },
      {
        "tag": "#EVTariffTradeWar",
        "headline": "European Union and North America impose countervailing duties on imported electric vehicles",
        "velocity_score": 6050,
        "live_rooms": 1,
        "voice_replies": 50,
        "total_pulses": 480,
        "shares": 10,
        "category": "trending",
        "region": "world"
      },
      {
        "tag": "#HumanoidRoboticsRace",
        "headline": "Figure, Tesla Optimus, and Boston Dynamics demonstrate autonomous factory assembly line tasks",
        "velocity_score": 5900,
        "live_rooms": 1,
        "voice_replies": 45,
        "total_pulses": 450,
        "shares": 8,
        "category": "trending",
        "region": "world"
      }
    ],
    "news": [
      {
        "tag": "#USElectionsImpact",
        "headline": "Shift in White House trade and defense policies causes diplomatic realignments across NATO and Asia-Pacific",
        "velocity_score": 9600,
        "live_rooms": 6,
        "voice_replies": 280,
        "total_pulses": 2150,
        "shares": 145,
        "category": "news",
        "region": "world"
      },
      {
        "tag": "#MiddleEastPeaceTalks",
        "headline": "Ceasefire negotiations and regional security pacts face complex diplomatic roadblocks in Geneva",
        "velocity_score": 9300,
        "live_rooms": 5,
        "voice_replies": 245,
        "total_pulses": 1880,
        "shares": 125,
        "category": "news",
        "region": "world"
      },
      {
        "tag": "#GlobalTariffClash",
        "headline": "World Trade Organization warns of trade fragmentation as major economies increase reciprocal duties",
        "velocity_score": 9050,
        "live_rooms": 4,
        "voice_replies": 215,
        "total_pulses": 1690,
        "shares": 110,
        "category": "news",
        "region": "world"
      },
      {
        "tag": "#EuropeanDefensePact",
        "headline": "EU member states approve joint military procurement and air defense shield expansion",
        "velocity_score": 8800,
        "live_rooms": 4,
        "voice_replies": 190,
        "total_pulses": 1520,
        "shares": 95,
        "category": "news",
        "region": "world"
      },
      {
        "tag": "#ClimateSummitStandoff",
        "headline": "Developing and wealthy nations clash over $1 trillion annual loss-and-damage climate finance fund",
        "velocity_score": 8600,
        "live_rooms": 3,
        "voice_replies": 175,
        "total_pulses": 1390,
        "shares": 85,
        "category": "news",
        "region": "world"
      },
      {
        "tag": "#RedSeaShippingCorridor",
        "headline": "Naval coalition intercepts anti-ship ballistic missiles protecting critical international trade lanes",
        "velocity_score": 8400,
        "live_rooms": 3,
        "voice_replies": 160,
        "total_pulses": 1290,
        "shares": 75,
        "category": "news",
        "region": "world"
      },
      {
        "tag": "#TaiwanStraitTensions",
        "headline": "Naval carrier strike groups conduct freedom of navigation exercises amid cross-strait military drills",
        "velocity_score": 8200,
        "live_rooms": 3,
        "voice_replies": 145,
        "total_pulses": 1190,
        "shares": 68,
        "category": "news",
        "region": "world"
      },
      {
        "tag": "#UNSecurityCouncilReform",
        "headline": "General Assembly leaders demand expansion of permanent seats to include India, Japan, Germany, and Africa",
        "velocity_score": 8000,
        "live_rooms": 2,
        "voice_replies": 135,
        "total_pulses": 1100,
        "shares": 60,
        "category": "news",
        "region": "world"
      },
      {
        "tag": "#GlobalInflationTrends",
        "headline": "Central banks in Europe and Asia cautiously cut interest rates as wage growth stabilizes",
        "velocity_score": 7820,
        "live_rooms": 2,
        "voice_replies": 125,
        "total_pulses": 1020,
        "shares": 52,
        "category": "news",
        "region": "world"
      },
      {
        "tag": "#AntarcticaIceShelfLoss",
        "headline": "Satellite telemetry reveals accelerating melting rates in Thwaites glacier sparking coastal alarm",
        "velocity_score": 7650,
        "live_rooms": 2,
        "voice_replies": 115,
        "total_pulses": 950,
        "shares": 46,
        "category": "news",
        "region": "world"
      },
      {
        "tag": "#GlobalCyberEspionage",
        "headline": "International intelligence consortium issues alert over state-sponsored telecom infrastructure backdoors",
        "velocity_score": 7480,
        "live_rooms": 2,
        "voice_replies": 105,
        "total_pulses": 890,
        "shares": 40,
        "category": "news",
        "region": "world"
      },
      {
        "tag": "#SovereignDebtRestructuring",
        "headline": "IMF and Paris Club finalize debt relief agreements for distressed emerging economies",
        "velocity_score": 7320,
        "live_rooms": 2,
        "voice_replies": 95,
        "total_pulses": 830,
        "shares": 35,
        "category": "news",
        "region": "world"
      },
      {
        "tag": "#SpaceExplorationTreaty",
        "headline": "Nations draft lunar resource extraction guidelines under updated international space accords",
        "velocity_score": 7150,
        "live_rooms": 1,
        "voice_replies": 90,
        "total_pulses": 780,
        "shares": 30,
        "category": "news",
        "region": "world"
      },
      {
        "tag": "#NuclearEnergyRevival",
        "headline": "Over 20 countries pledge to triple nuclear energy output by 2050 to meet zero-emission targets",
        "velocity_score": 6980,
        "live_rooms": 1,
        "voice_replies": 85,
        "total_pulses": 730,
        "shares": 26,
        "category": "news",
        "region": "world"
      },
      {
        "tag": "#GlobalPandemicTreaty",
        "headline": "WHO member states negotiate binding pathogen access and vaccine sharing protocols",
        "velocity_score": 6820,
        "live_rooms": 1,
        "voice_replies": 80,
        "total_pulses": 690,
        "shares": 22,
        "category": "news",
        "region": "world"
      },
      {
        "tag": "#CriticalMineralsAlliance",
        "headline": "Western nations form supply chain partnership for lithium, nickel, cobalt, and rare earth processing",
        "velocity_score": 6650,
        "live_rooms": 1,
        "voice_replies": 75,
        "total_pulses": 650,
        "shares": 19,
        "category": "news",
        "region": "world"
      },
      {
        "tag": "#GlobalHumanitarianAid",
        "headline": "UN food agencies appeal for urgent funding as conflict zones face critical supply deficits",
        "velocity_score": 6500,
        "live_rooms": 1,
        "voice_replies": 70,
        "total_pulses": 610,
        "shares": 16,
        "category": "news",
        "region": "world"
      },
      {
        "tag": "#ArtificialIslandsDispute",
        "headline": "South China Sea territorial claimant states conduct joint maritime sovereignty patrols",
        "velocity_score": 6350,
        "live_rooms": 1,
        "voice_replies": 65,
        "total_pulses": 570,
        "shares": 14,
        "category": "news",
        "region": "world"
      },
      {
        "tag": "#ImmigrationBorderPolicies",
        "headline": "European and North American governments enforce stricter asylum processing standards",
        "velocity_score": 6200,
        "live_rooms": 1,
        "voice_replies": 60,
        "total_pulses": 540,
        "shares": 12,
        "category": "news",
        "region": "world"
      },
      {
        "tag": "#UnderseaCableSecurity",
        "headline": "Telecommunications alliances deploy acoustic submarine drones to protect intercontinental fiber cables",
        "velocity_score": 6050,
        "live_rooms": 1,
        "voice_replies": 55,
        "total_pulses": 510,
        "shares": 10,
        "category": "news",
        "region": "world"
      },
      {
        "tag": "#DeepSeaMiningMoratorium",
        "headline": "International Seabed Authority debates commercial permits for polymetallic nodule harvesting",
        "velocity_score": 5900,
        "live_rooms": 1,
        "voice_replies": 50,
        "total_pulses": 480,
        "shares": 8,
        "category": "news",
        "region": "world"
      },
      {
        "tag": "#GlobalWaterSecurity",
        "headline": "World Bank report warns of severe agricultural water stress across Mediterranean and African river basins",
        "velocity_score": 5750,
        "live_rooms": 1,
        "voice_replies": 45,
        "total_pulses": 450,
        "shares": 7,
        "category": "news",
        "region": "world"
      },
      {
        "tag": "#BalkanDiplomaticTensions",
        "headline": "European peacekeepers reinforce border checkpoints following localized security skirmishes",
        "velocity_score": 5600,
        "live_rooms": 1,
        "voice_replies": 40,
        "total_pulses": 420,
        "shares": 6,
        "category": "news",
        "region": "world"
      },
      {
        "tag": "#ArcticShippingRoutes",
        "headline": "Melting polar ice opens northern sea routes sparking commercial navigation disputes",
        "velocity_score": 5450,
        "live_rooms": 1,
        "voice_replies": 35,
        "total_pulses": 390,
        "shares": 5,
        "category": "news",
        "region": "world"
      },
      {
        "tag": "#GlobalEnergyTransition",
        "headline": "Renewable electricity generation surpasses coal across major industrial economies",
        "velocity_score": 5300,
        "live_rooms": 1,
        "voice_replies": 30,
        "total_pulses": 360,
        "shares": 4,
        "category": "news",
        "region": "world"
      }
    ],
    "tech": [
      {
        "tag": "#OpenAIVsMusk",
        "headline": "Elon Musk expands federal antitrust lawsuit against OpenAI over alleged monopolization of frontier AI talent",
        "velocity_score": 9800,
        "live_rooms": 7,
        "voice_replies": 330,
        "total_pulses": 2600,
        "shares": 190,
        "category": "tech",
        "region": "world"
      },
      {
        "tag": "#DeepSeekR1Shock",
        "headline": "Open-weights reasoning model trained on $6M hardware matches $100M proprietary frontier LLMs",
        "velocity_score": 9600,
        "live_rooms": 6,
        "voice_replies": 300,
        "total_pulses": 2350,
        "shares": 170,
        "category": "tech",
        "region": "world"
      },
      {
        "tag": "#NvidiaBlackwellDelivery",
        "headline": "Jensen Huang confirms GB200 AI superchips entering mass hyperscaler deployment despite thermal challenges",
        "velocity_score": 9350,
        "live_rooms": 5,
        "voice_replies": 260,
        "total_pulses": 2080,
        "shares": 140,
        "category": "tech",
        "region": "world"
      },
      {
        "tag": "#AppleIntelligenceRollout",
        "headline": "Apple integrates visual intelligence and on-device Siri reasoning across iPhone 16 Pro lineup",
        "velocity_score": 9100,
        "live_rooms": 5,
        "voice_replies": 230,
        "total_pulses": 1850,
        "shares": 120,
        "category": "tech",
        "region": "world"
      },
      {
        "tag": "#GoogleGemini2Launch",
        "headline": "DeepMind introduces real-time multimodal reasoning and universal computer use API agents",
        "velocity_score": 8880,
        "live_rooms": 4,
        "voice_replies": 205,
        "total_pulses": 1670,
        "shares": 105,
        "category": "tech",
        "region": "world"
      },
      {
        "tag": "#Claude35SonnetCoding",
        "headline": "Anthropic's Computer Use agent automates complex multi-step desktop workflows and browser QA",
        "velocity_score": 8650,
        "live_rooms": 4,
        "voice_replies": 185,
        "total_pulses": 1510,
        "shares": 90,
        "category": "tech",
        "region": "world"
      },
      {
        "tag": "#QuantumSupremacyMilestone",
        "headline": "Quantum computing laboratory demonstrates fault-tolerant logical qubits with 99.9% gate fidelity",
        "velocity_score": 8450,
        "live_rooms": 3,
        "voice_replies": 170,
        "total_pulses": 1390,
        "shares": 80,
        "category": "tech",
        "region": "world"
      },
      {
        "tag": "#TSMC2nmProduction",
        "headline": "Taiwan foundry giant begins risk production of 2nm nanosheet transistor wafers for next-gen silicon",
        "velocity_score": 8250,
        "live_rooms": 3,
        "voice_replies": 155,
        "total_pulses": 1280,
        "shares": 70,
        "category": "tech",
        "region": "world"
      },
      {
        "tag": "#CrowdStrikeSecurityShift",
        "headline": "Enterprise IT architectures move to user-mode endpoint detection and zero-trust verification",
        "velocity_score": 8050,
        "live_rooms": 3,
        "voice_replies": 140,
        "total_pulses": 1180,
        "shares": 62,
        "category": "tech",
        "region": "world"
      },
      {
        "tag": "#OpenSourceWeightsDebate",
        "headline": "AI researchers publish manifesto demanding unrestricted open release of model weights and dataset recipes",
        "velocity_score": 7880,
        "live_rooms": 2,
        "voice_replies": 130,
        "total_pulses": 1090,
        "shares": 55,
        "category": "tech",
        "region": "world"
      },
      {
        "tag": "#HumanoidRoboticsDeployment",
        "headline": "Automotive assembly lines pilot autonomous humanoid bipedal robots for dangerous component transport",
        "velocity_score": 7700,
        "live_rooms": 2,
        "voice_replies": 120,
        "total_pulses": 1010,
        "shares": 48,
        "category": "tech",
        "region": "world"
      },
      {
        "tag": "#MetaLlama4Training",
        "headline": "Mark Zuckerberg details 100,000 H100 cluster training Llama 4 with native multimodal reasoning",
        "velocity_score": 7520,
        "live_rooms": 2,
        "voice_replies": 110,
        "total_pulses": 940,
        "shares": 42,
        "category": "tech",
        "region": "world"
      },
      {
        "tag": "#StarlinkDirectToCell",
        "headline": "SpaceX activates satellite-to-unmodified-smartphone text and emergency calling in partnership with telcos",
        "velocity_score": 7350,
        "live_rooms": 2,
        "voice_replies": 100,
        "total_pulses": 880,
        "shares": 38,
        "category": "tech",
        "region": "world"
      },
      {
        "tag": "#EUDataActEnforcement",
        "headline": "European privacy watchdogs mandate cloud interoperability and free data portability for enterprises",
        "velocity_score": 7180,
        "live_rooms": 1,
        "voice_replies": 95,
        "total_pulses": 820,
        "shares": 34,
        "category": "tech",
        "region": "world"
      },
      {
        "tag": "#AutonomousVehiclesSafety",
        "headline": "Autonomous driving safety metrics show 85% reduction in injury-causing accidents compared to human drivers",
        "velocity_score": 7020,
        "live_rooms": 1,
        "voice_replies": 90,
        "total_pulses": 770,
        "shares": 30,
        "category": "tech",
        "region": "world"
      },
      {
        "tag": "#SiliconPhotonicsNetworking",
        "headline": "Optical interconnect transceivers replace copper cables in high-bandwidth AI computing clusters",
        "velocity_score": 6880,
        "live_rooms": 1,
        "voice_replies": 85,
        "total_pulses": 730,
        "shares": 26,
        "category": "tech",
        "region": "world"
      },
      {
        "tag": "#CyberSecurityAIArmsRace",
        "headline": "Autonomous defensive AI agents battle automated malware mutation engines in enterprise networks",
        "velocity_score": 6720,
        "live_rooms": 1,
        "voice_replies": 80,
        "total_pulses": 690,
        "shares": 22,
        "category": "tech",
        "region": "world"
      },
      {
        "tag": "#SyntheticDataRevolution",
        "headline": "AI labs train next-gen models on physics-verified synthetic environments to bypass web data exhaustion",
        "velocity_score": 6580,
        "live_rooms": 1,
        "voice_replies": 75,
        "total_pulses": 650,
        "shares": 19,
        "category": "tech",
        "region": "world"
      },
      {
        "tag": "#BrainComputerInterfaces",
        "headline": "Neural interface implants enable paralyzed individuals to control robotic limbs and write code via thought",
        "velocity_score": 6420,
        "live_rooms": 1,
        "voice_replies": 70,
        "total_pulses": 610,
        "shares": 16,
        "category": "tech",
        "region": "world"
      },
      {
        "tag": "#SolidStateBatteryAuto",
        "headline": "Automotive battery developers demonstrate 1,000km range solid-state cells with 10-minute fast charging",
        "velocity_score": 6280,
        "live_rooms": 1,
        "voice_replies": 65,
        "total_pulses": 580,
        "shares": 14,
        "category": "tech",
        "region": "world"
      },
      {
        "tag": "#PostQuantumCryptography",
        "headline": "Global financial backbones begin migrating public key infrastructure to lattice-based algorithms",
        "velocity_score": 6140,
        "live_rooms": 1,
        "voice_replies": 60,
        "total_pulses": 550,
        "shares": 12,
        "category": "tech",
        "region": "world"
      },
      {
        "tag": "#EdgeBrowserAIAgents",
        "headline": "Lightweight SLMs run locally inside browser tabs performing zero-latency document summarization",
        "velocity_score": 6000,
        "live_rooms": 1,
        "voice_replies": 55,
        "total_pulses": 520,
        "shares": 10,
        "category": "tech",
        "region": "world"
      },
      {
        "tag": "#NuclearPoweredHyperscalers",
        "headline": "Tech giants fund restarts of dormant nuclear reactors to supply carbon-free baseload power to AI server farms",
        "velocity_score": 5860,
        "live_rooms": 1,
        "voice_replies": 50,
        "total_pulses": 490,
        "shares": 8,
        "category": "tech",
        "region": "world"
      },
      {
        "tag": "#OpenSourceRoboticsROS",
        "headline": "Robotics community standardizes universal foundation policy models for multi-fingered dexterous manipulation",
        "velocity_score": 5720,
        "live_rooms": 1,
        "voice_replies": 45,
        "total_pulses": 460,
        "shares": 7,
        "category": "tech",
        "region": "world"
      },
      {
        "tag": "#ARSmartGlassesBoom",
        "headline": "Lightweight neural-interface smart glasses with display overlays enter consumer adoption phase",
        "velocity_score": 5580,
        "live_rooms": 1,
        "voice_replies": 40,
        "total_pulses": 430,
        "shares": 5,
        "category": "tech",
        "region": "world"
      }
    ],
    "markets": [
      {
        "tag": "#Bitcoin100KBreached",
        "headline": "Spot crypto ETFs record $2B daily net inflows as Bitcoin breaks all-time psychological $100,000 threshold",
        "velocity_score": 9800,
        "live_rooms": 7,
        "voice_replies": 340,
        "total_pulses": 2650,
        "shares": 195,
        "category": "markets",
        "region": "world"
      },
      {
        "tag": "#FedRatePolicyStandoff",
        "headline": "Federal Reserve officials debate pace of rate cuts amid resilient employment and sticky core inflation",
        "velocity_score": 9500,
        "live_rooms": 6,
        "voice_replies": 290,
        "total_pulses": 2280,
        "shares": 160,
        "category": "markets",
        "region": "world"
      },
      {
        "tag": "#NvidiaEarningsShock",
        "headline": "Semiconductor behemoth posts 120% revenue growth as hyperscaler AI infrastructure capex expands",
        "velocity_score": 9250,
        "live_rooms": 5,
        "voice_replies": 255,
        "total_pulses": 1980,
        "shares": 135,
        "category": "markets",
        "region": "world"
      },
      {
        "tag": "#GlobalGoldSupercycle",
        "headline": "Gold crosses $2,800/oz as sovereign wealth funds diversify away from US dollar debt holdings",
        "velocity_score": 9000,
        "live_rooms": 5,
        "voice_replies": 225,
        "total_pulses": 1780,
        "shares": 115,
        "category": "markets",
        "region": "world"
      },
      {
        "tag": "#USNationalDebt36T",
        "headline": "US sovereign debt crosses $36 trillion sparking heated fiscal deficit and treasury auction debates",
        "velocity_score": 8750,
        "live_rooms": 4,
        "voice_replies": 200,
        "total_pulses": 1600,
        "shares": 100,
        "category": "markets",
        "region": "world"
      },
      {
        "tag": "#ChinaStimulusPackage",
        "headline": "People's Bank of China unleashes massive liquidity and real estate refinancing to boost consumer demand",
        "velocity_score": 8500,
        "live_rooms": 4,
        "voice_replies": 180,
        "total_pulses": 1450,
        "shares": 88,
        "category": "markets",
        "region": "world"
      },
      {
        "tag": "#TechMegaCapValuations",
        "headline": "Magnificent Seven market capitalization approaches 35% of total S&P 500 index weighting",
        "velocity_score": 8300,
        "live_rooms": 3,
        "voice_replies": 165,
        "total_pulses": 1330,
        "shares": 78,
        "category": "markets",
        "region": "world"
      },
      {
        "tag": "#CommercialRealEstateCrisis",
        "headline": "Regional banks write down office building loan portfolios as remote work reshapes city centers",
        "velocity_score": 8100,
        "live_rooms": 3,
        "voice_replies": 150,
        "total_pulses": 1220,
        "shares": 68,
        "category": "markets",
        "region": "world"
      },
      {
        "tag": "#OilMarketOPECQuotas",
        "headline": "OPEC+ extends voluntary production cuts to support crude prices against rising US shale output",
        "velocity_score": 7920,
        "live_rooms": 2,
        "voice_replies": 135,
        "total_pulses": 1120,
        "shares": 60,
        "category": "markets",
        "region": "world"
      },
      {
        "tag": "#EthereumETFScaling",
        "headline": "Institutional layer-1 staking and decentralized finance asset tokenization gain regulatory clarity",
        "velocity_score": 7750,
        "live_rooms": 2,
        "voice_replies": 125,
        "total_pulses": 1030,
        "shares": 52,
        "category": "markets",
        "region": "world"
      },
      {
        "tag": "#YenCarryTradeUnwind",
        "headline": "Bank of Japan interest rate hikes trigger global currency fluctuations and equity volatility",
        "velocity_score": 7580,
        "live_rooms": 2,
        "voice_replies": 115,
        "total_pulses": 950,
        "shares": 46,
        "category": "markets",
        "region": "world"
      },
      {
        "tag": "#GlobalTariffStockSelloff",
        "headline": "Import-heavy automotive and retail stocks slide following tariff implementation announcements",
        "velocity_score": 7420,
        "live_rooms": 2,
        "voice_replies": 105,
        "total_pulses": 890,
        "shares": 40,
        "category": "markets",
        "region": "world"
      },
      {
        "tag": "#PrivateCreditBoom",
        "headline": "Alternative asset managers expand $1.7 trillion direct lending market competing with investment banks",
        "velocity_score": 7250,
        "live_rooms": 1,
        "voice_replies": 95,
        "total_pulses": 830,
        "shares": 35,
        "category": "markets",
        "region": "world"
      },
      {
        "tag": "#CopperShortageForecast",
        "headline": "Clean energy transition and AI data center wiring drive global copper supply deficits",
        "velocity_score": 7100,
        "live_rooms": 1,
        "voice_replies": 90,
        "total_pulses": 780,
        "shares": 30,
        "category": "markets",
        "region": "world"
      },
      {
        "tag": "#ShortSellerBattles",
        "headline": "Activist hedge funds target overvalued green energy and fintech firms with scathing research reports",
        "velocity_score": 6950,
        "live_rooms": 1,
        "voice_replies": 85,
        "total_pulses": 730,
        "shares": 26,
        "category": "markets",
        "region": "world"
      },
      {
        "tag": "#DollarIndexRally",
        "headline": "Greenback strengthens against euro and sterling as interest rate differentials favor US assets",
        "velocity_score": 6800,
        "live_rooms": 1,
        "voice_replies": 80,
        "total_pulses": 690,
        "shares": 22,
        "category": "markets",
        "region": "world"
      },
      {
        "tag": "#RetailTradingOptionsSurge",
        "headline": "Zero-day-to-expiry (0DTE) option contracts account for 50% of total S&P 500 options trading volume",
        "velocity_score": 6650,
        "live_rooms": 1,
        "voice_replies": 75,
        "total_pulses": 650,
        "shares": 19,
        "category": "markets",
        "region": "world"
      },
      {
        "tag": "#EuropeanStagflationFears",
        "headline": "Manufacturing slowdown in Germany and France contrasts with service sector resilience",
        "velocity_score": 6500,
        "live_rooms": 1,
        "voice_replies": 70,
        "total_pulses": 610,
        "shares": 16,
        "category": "markets",
        "region": "world"
      },
      {
        "tag": "#SemiconductorEquipmentRally",
        "headline": "ASML, Applied Materials, and Lam Research gain on aggressive global fab construction demand",
        "velocity_score": 6350,
        "live_rooms": 1,
        "voice_replies": 65,
        "total_pulses": 570,
        "shares": 14,
        "category": "markets",
        "region": "world"
      },
      {
        "tag": "#TokenizedTreasuriesSurge",
        "headline": "Tokenized US Government money market funds surpass $2 billion on public blockchain ledgers",
        "velocity_score": 6200,
        "live_rooms": 1,
        "voice_replies": 60,
        "total_pulses": 540,
        "shares": 12,
        "category": "markets",
        "region": "world"
      },
      {
        "tag": "#EmergingMarketDebtRally",
        "headline": "High-yielding sovereign bonds in Latin America and Southeast Asia attract foreign institutional capital",
        "velocity_score": 6050,
        "live_rooms": 1,
        "voice_replies": 55,
        "total_pulses": 510,
        "shares": 10,
        "category": "markets",
        "region": "world"
      },
      {
        "tag": "#UraniumMiningBullMarket",
        "headline": "Nuclear revival and uranium supply constraints propel mining stocks to multi-year highs",
        "velocity_score": 5900,
        "live_rooms": 1,
        "voice_replies": 50,
        "total_pulses": 480,
        "shares": 8,
        "category": "markets",
        "region": "world"
      },
      {
        "tag": "#AutomatedMarketMakerVolumes",
        "headline": "Decentralized exchanges capture record market share of spot cryptocurrency trading",
        "velocity_score": 5750,
        "live_rooms": 1,
        "voice_replies": 45,
        "total_pulses": 450,
        "shares": 7,
        "category": "markets",
        "region": "world"
      },
      {
        "tag": "#AerospaceDefenseBacklog",
        "headline": "Global defense contractors report multi-year record order backlogs amidst geopolitical rearmament",
        "velocity_score": 5600,
        "live_rooms": 1,
        "voice_replies": 40,
        "total_pulses": 420,
        "shares": 6,
        "category": "markets",
        "region": "world"
      },
      {
        "tag": "#CarbonOffsetMarketReboot",
        "headline": "Regulators introduce standardized integrity benchmarks for voluntary corporate carbon credit trading",
        "velocity_score": 5450,
        "live_rooms": 1,
        "voice_replies": 35,
        "total_pulses": 390,
        "shares": 5,
        "category": "markets",
        "region": "world"
      }
    ],
    "sports": [
      {
        "tag": "#ChampionsLeagueFormatDebate",
        "headline": "UEFA's 36-team Swiss model league phase divides fans as top European clubs clash in grueling schedule",
        "velocity_score": 9650,
        "live_rooms": 6,
        "voice_replies": 290,
        "total_pulses": 2200,
        "shares": 150,
        "category": "sports",
        "region": "world"
      },
      {
        "tag": "#BallonDorControversy",
        "headline": "Real Madrid boycotts awards ceremony after Vinicius Junior finishes runner-up in shocking vote tally",
        "velocity_score": 9400,
        "live_rooms": 6,
        "voice_replies": 265,
        "total_pulses": 1980,
        "shares": 130,
        "category": "sports",
        "region": "world"
      },
      {
        "tag": "#ElClasicoShowdown",
        "headline": "Barcelona and Real Madrid engage in high-octane battle at Bernabeu with title race at stake",
        "velocity_score": 9150,
        "live_rooms": 5,
        "voice_replies": 235,
        "total_pulses": 1790,
        "shares": 115,
        "category": "sports",
        "region": "world"
      },
      {
        "tag": "#PremierLeagueTitleRace",
        "headline": "Liverpool, Arsenal, and Manchester City locked in thrilling multi-team championship battle",
        "velocity_score": 8900,
        "live_rooms": 4,
        "voice_replies": 210,
        "total_pulses": 1620,
        "shares": 100,
        "category": "sports",
        "region": "world"
      },
      {
        "tag": "#ManCity115ChargesTrial",
        "headline": "Independent regulatory commission begins hearing on alleged financial fair play rule breaches",
        "velocity_score": 8700,
        "live_rooms": 4,
        "voice_replies": 190,
        "total_pulses": 1480,
        "shares": 90,
        "category": "sports",
        "region": "world"
      },
      {
        "tag": "#VARRefereeScandal",
        "headline": "Key refereeing decisions in top European leagues trigger calls for semi-automated AI decision making",
        "velocity_score": 8500,
        "live_rooms": 3,
        "voice_replies": 170,
        "total_pulses": 1360,
        "shares": 80,
        "category": "sports",
        "region": "world"
      },
      {
        "tag": "#F1ChampionshipBattle",
        "headline": "Max Verstappen and Lando Norris battle on track in tense, penalty-filled Formula 1 grand prix",
        "velocity_score": 8300,
        "live_rooms": 3,
        "voice_replies": 155,
        "total_pulses": 1250,
        "shares": 72,
        "category": "sports",
        "region": "world"
      },
      {
        "tag": "#NBAInSeasonTournament",
        "headline": "Emirates NBA Cup features intense knockout basketball with star duos putting on clinic",
        "velocity_score": 8100,
        "live_rooms": 3,
        "voice_replies": 140,
        "total_pulses": 1150,
        "shares": 65,
        "category": "sports",
        "region": "world"
      },
      {
        "tag": "#SuperBowlContenders",
        "headline": "Kansas City Chiefs chase historic three-peat as contenders battle in thrilling playoff seedings",
        "velocity_score": 7920,
        "live_rooms": 2,
        "voice_replies": 130,
        "total_pulses": 1060,
        "shares": 58,
        "category": "sports",
        "region": "world"
      },
      {
        "tag": "#TennisGrandSlamGeneration",
        "headline": "Carlos Alcaraz and Jannik Sinner establish dominant new rivalry sweeping major titles",
        "velocity_score": 7750,
        "live_rooms": 2,
        "voice_replies": 120,
        "total_pulses": 980,
        "shares": 50,
        "category": "sports",
        "region": "world"
      },
      {
        "tag": "#UFCHeavyweightTitleClash",
        "headline": "Jon Jones delivers knockout spinning back-kick victory cementing legacy as all-time combat master",
        "velocity_score": 7580,
        "live_rooms": 2,
        "voice_replies": 110,
        "total_pulses": 910,
        "shares": 45,
        "category": "sports",
        "region": "world"
      },
      {
        "tag": "#SaudiLeagueExpansion",
        "headline": "Middle Eastern clubs target prime European superstars with record-breaking contract packages",
        "velocity_score": 7420,
        "live_rooms": 2,
        "voice_replies": 100,
        "total_pulses": 850,
        "shares": 40,
        "category": "sports",
        "region": "world"
      },
      {
        "tag": "#GolfPGAvsLIVMerger",
        "headline": "PGA Tour and Saudi Public Investment Fund finalize framework agreement to reunite men's professional golf",
        "velocity_score": 7250,
        "live_rooms": 1,
        "voice_replies": 95,
        "total_pulses": 800,
        "shares": 35,
        "category": "sports",
        "region": "world"
      },
      {
        "tag": "#Olympics2028LosAngeles",
        "headline": "Organizers confirm inclusion of cricket, flag football, squash, and lacrosse in official sports program",
        "velocity_score": 7100,
        "live_rooms": 1,
        "voice_replies": 90,
        "total_pulses": 750,
        "shares": 30,
        "category": "sports",
        "region": "world"
      },
      {
        "tag": "#BoxingUndisputedTitle",
        "headline": "Heavyweight undisputed showdown produces explosive 12-round split decision slugfest",
        "velocity_score": 6950,
        "live_rooms": 1,
        "voice_replies": 85,
        "total_pulses": 710,
        "shares": 26,
        "category": "sports",
        "region": "world"
      },
      {
        "tag": "#WomensSoccerViewership",
        "headline": "NWSL and Women's Champions League record historic television broadcast ratings and franchise valuations",
        "velocity_score": 6800,
        "live_rooms": 1,
        "voice_replies": 80,
        "total_pulses": 670,
        "shares": 22,
        "category": "sports",
        "region": "world"
      },
      {
        "tag": "#MLBWorldSeriesThriller",
        "headline": "Dodgers and Yankees clash in historic coastal World Series spectacle watched by millions globally",
        "velocity_score": 6650,
        "live_rooms": 1,
        "voice_replies": 75,
        "total_pulses": 630,
        "shares": 19,
        "category": "sports",
        "region": "world"
      },
      {
        "tag": "#CyclingTourDeFrance",
        "headline": "Tadej Pogacar conquers brutal Alpine climbs to seal historic Giro-Tour double championship",
        "velocity_score": 6500,
        "live_rooms": 1,
        "voice_replies": 70,
        "total_pulses": 590,
        "shares": 16,
        "category": "sports",
        "region": "world"
      },
      {
        "tag": "#RugbySixNations",
        "headline": "Ireland and France deliver physical masterclasses in thrilling Six Nations championship decider",
        "velocity_score": 6350,
        "live_rooms": 1,
        "voice_replies": 65,
        "total_pulses": 560,
        "shares": 14,
        "category": "sports",
        "region": "world"
      },
      {
        "tag": "#CricketGlobalUSExpansion",
        "headline": "Major League Cricket secures ICC status as cricket participation expands rapidly across North America",
        "velocity_score": 6200,
        "live_rooms": 1,
        "voice_replies": 60,
        "total_pulses": 530,
        "shares": 12,
        "category": "sports",
        "region": "world"
      },
      {
        "tag": "#EsportsWorldsFinals",
        "headline": "League of Legends World Championship sells out London O2 Arena with 6 million peak live viewers",
        "velocity_score": 6050,
        "live_rooms": 1,
        "voice_replies": 55,
        "total_pulses": 500,
        "shares": 10,
        "category": "sports",
        "region": "world"
      },
      {
        "tag": "#AthleticsWorldRecords",
        "headline": "Mondo Duplantis shatters pole vault world record for the eleventh consecutive time",
        "velocity_score": 5900,
        "live_rooms": 1,
        "voice_replies": 50,
        "total_pulses": 470,
        "shares": 8,
        "category": "sports",
        "region": "world"
      },
      {
        "tag": "#SwimmingWorldChampionships",
        "headline": "Leon Marchand breaks Michael Phelps individual medley standards in electric swimming finals",
        "velocity_score": 5750,
        "live_rooms": 1,
        "voice_replies": 45,
        "total_pulses": 440,
        "shares": 7,
        "category": "sports",
        "region": "world"
      },
      {
        "tag": "#WNBAExpansionBoom",
        "headline": "Caitlin Clark and Angel Reese drive sellouts, television records, and new multi-city franchise expansion",
        "velocity_score": 5600,
        "live_rooms": 1,
        "voice_replies": 40,
        "total_pulses": 410,
        "shares": 6,
        "category": "sports",
        "region": "world"
      },
      {
        "tag": "#WinterOlympicsMilanoCortina",
        "headline": "Italian organizers unveil sustainable alpine venues and zero-emission athlete village blueprints",
        "velocity_score": 5450,
        "live_rooms": 1,
        "voice_replies": 35,
        "total_pulses": 380,
        "shares": 5,
        "category": "sports",
        "region": "world"
      }
    ],
    "startup": [
      {
        "tag": "#AIWrappersExtinction",
        "headline": "Venture capitalists freeze funding for shallow LLM wrappers as open-source models replicate core features",
        "velocity_score": 9650,
        "live_rooms": 6,
        "voice_replies": 295,
        "total_pulses": 2220,
        "shares": 155,
        "category": "startup",
        "region": "world"
      },
      {
        "tag": "#YCombinatorAIBatch",
        "headline": "YC demo day reveals 85% of cohort building vertical AI agents for legal, medical, and defense workflows",
        "velocity_score": 9380,
        "live_rooms": 5,
        "voice_replies": 255,
        "total_pulses": 1940,
        "shares": 130,
        "category": "startup",
        "region": "world"
      },
      {
        "tag": "#SaaSValuationMultiples",
        "headline": "Enterprise software revenue multiples compress from 30x to 8x forcing startups to prove net profitability",
        "velocity_score": 9120,
        "live_rooms": 5,
        "voice_replies": 230,
        "total_pulses": 1760,
        "shares": 115,
        "category": "startup",
        "region": "world"
      },
      {
        "tag": "#DefenseTechBoom",
        "headline": "Anduril, Palantir, and autonomous drone startups attract billions in private venture and sovereign backing",
        "velocity_score": 8880,
        "live_rooms": 4,
        "voice_replies": 205,
        "total_pulses": 1590,
        "shares": 100,
        "category": "startup",
        "region": "world"
      },
      {
        "tag": "#DecentralizedComputeNetworks",
        "headline": "DePIN protocols crowdsource consumer GPUs to provide low-cost decentralized AI model training",
        "velocity_score": 8620,
        "live_rooms": 4,
        "voice_replies": 185,
        "total_pulses": 1440,
        "shares": 88,
        "category": "startup",
        "region": "world"
      },
      {
        "tag": "#ClimateHardwareUnicorns",
        "headline": "Direct air carbon capture and geothermal energy startups secure mega Series C growth checks",
        "velocity_score": 8400,
        "live_rooms": 3,
        "voice_replies": 165,
        "total_pulses": 1310,
        "shares": 78,
        "category": "startup",
        "region": "world"
      },
      {
        "tag": "#SoloFounderUnicorns",
        "headline": "Single-founder AI startups scale to $10M ARR with zero full-time employees using agentic workflows",
        "velocity_score": 8200,
        "live_rooms": 3,
        "voice_replies": 150,
        "total_pulses": 1200,
        "shares": 68,
        "category": "startup",
        "region": "world"
      },
      {
        "tag": "#BioTechAIProteins",
        "headline": "Generative protein design startups discover novel cancer therapeutics in record six-month timelines",
        "velocity_score": 8000,
        "live_rooms": 3,
        "voice_replies": 135,
        "total_pulses": 1100,
        "shares": 60,
        "category": "startup",
        "region": "world"
      },
      {
        "tag": "#FintechPaymentOrchestration",
        "headline": "Global cross-border settlement startups displace legacy SWIFT wire transfers using stablecoins",
        "velocity_score": 7820,
        "live_rooms": 2,
        "voice_replies": 125,
        "total_pulses": 1010,
        "shares": 52,
        "category": "startup",
        "region": "world"
      },
      {
        "tag": "#SecondaryShareLiquidity",
        "headline": "Secondary market platforms see heavy discounted trading of late-stage private unicorn employee stock",
        "velocity_score": 7650,
        "live_rooms": 2,
        "voice_replies": 115,
        "total_pulses": 930,
        "shares": 45,
        "category": "startup",
        "region": "world"
      },
      {
        "tag": "#NuclearFusionCommercialization",
        "headline": "Magnetic confinement fusion startups achieve net energy gain milestones in private reactor tests",
        "velocity_score": 7480,
        "live_rooms": 2,
        "voice_replies": 105,
        "total_pulses": 860,
        "shares": 40,
        "category": "startup",
        "region": "world"
      },
      {
        "tag": "#AutonomousDeliveryBots",
        "headline": "Sidewalk and campus delivery robots surpass 50 million commercial food deliveries worldwide",
        "velocity_score": 7320,
        "live_rooms": 2,
        "voice_replies": 95,
        "total_pulses": 800,
        "shares": 35,
        "category": "startup",
        "region": "world"
      },
      {
        "tag": "#SyntheticBiologyFabs",
        "headline": "Precision fermentation startups produce animal-free dairy and egg proteins at commercial scale",
        "velocity_score": 7150,
        "live_rooms": 1,
        "voice_replies": 90,
        "total_pulses": 750,
        "shares": 30,
        "category": "startup",
        "region": "world"
      },
      {
        "tag": "#SpacePayloadLaunchStartups",
        "headline": "Reusable small-satellite rocket companies challenge SpaceX rideshare pricing on orbital missions",
        "velocity_score": 6980,
        "live_rooms": 1,
        "voice_replies": 85,
        "total_pulses": 700,
        "shares": 26,
        "category": "startup",
        "region": "world"
      },
      {
        "tag": "#LegalTechAIAutomation",
        "headline": "Law firms adopt specialized contract analysis and litigation discovery AI agents saving 80% billable hours",
        "velocity_score": 6820,
        "live_rooms": 1,
        "voice_replies": 80,
        "total_pulses": 660,
        "shares": 22,
        "category": "startup",
        "region": "world"
      },
      {
        "tag": "#CyberInsuranceLossRatios",
        "headline": "Ransomware payouts force cyber insurance underwriters to demand strict zero-trust MFA compliance",
        "velocity_score": 6650,
        "live_rooms": 1,
        "voice_replies": 75,
        "total_pulses": 620,
        "shares": 19,
        "category": "startup",
        "region": "world"
      },
      {
        "tag": "#BatteryRecyclingHubs",
        "headline": "Closed-loop hydrometallurgical recycling plants extract 95% battery-grade nickel and cobalt from scrap EVs",
        "velocity_score": 6500,
        "live_rooms": 1,
        "voice_replies": 70,
        "total_pulses": 580,
        "shares": 16,
        "category": "startup",
        "region": "world"
      },
      {
        "tag": "#MicrochipDesignAutomation",
        "headline": "Generative EDA tools automate floorplanning and routing for multi-core RISC-V processor layouts",
        "velocity_score": 6350,
        "live_rooms": 1,
        "voice_replies": 65,
        "total_pulses": 540,
        "shares": 14,
        "category": "startup",
        "region": "world"
      },
      {
        "tag": "#QuantumSensorCommercialization",
        "headline": "Ultra-precise quantum gravimeters deployed for underground mineral exploration and GPS-denied navigation",
        "velocity_score": 6200,
        "live_rooms": 1,
        "voice_replies": 60,
        "total_pulses": 510,
        "shares": 12,
        "category": "startup",
        "region": "world"
      },
      {
        "tag": "#AlternativeProteinScaling",
        "headline": "Cultivated meat startups receive regulatory sale approvals in US, Singapore, and UK dining establishments",
        "velocity_score": 6050,
        "live_rooms": 1,
        "voice_replies": 55,
        "total_pulses": 480,
        "shares": 10,
        "category": "startup",
        "region": "world"
      },
      {
        "tag": "#SpatialComputingSoftware",
        "headline": "VisionOS and Quest enterprise developers build collaborative 3D medical training and CAD modeling suites",
        "velocity_score": 5900,
        "live_rooms": 1,
        "voice_replies": 50,
        "total_pulses": 450,
        "shares": 8,
        "category": "startup",
        "region": "world"
      },
      {
        "tag": "#CleanHydrogenElectrolyzers",
        "headline": "Next-gen AEM electrolyzer startups cut green hydrogen production costs below $2 per kilogram",
        "velocity_score": 5750,
        "live_rooms": 1,
        "voice_replies": 45,
        "total_pulses": 420,
        "shares": 7,
        "category": "startup",
        "region": "world"
      },
      {
        "tag": "#AgtechAutonomousTractors",
        "headline": "Camera-guided autonomous robotic tractors perform precise weed elimination reducing chemical herbicide use by 90%",
        "velocity_score": 5600,
        "live_rooms": 1,
        "voice_replies": 40,
        "total_pulses": 390,
        "shares": 6,
        "category": "startup",
        "region": "world"
      },
      {
        "tag": "#EdgeAIHardwareAccelerators",
        "headline": "Neuromorphic chip startups design brain-inspired event-based processors consuming milliwatts of power",
        "velocity_score": 5450,
        "live_rooms": 1,
        "voice_replies": 35,
        "total_pulses": 360,
        "shares": 5,
        "category": "startup",
        "region": "world"
      },
      {
        "tag": "#AutonomousOceanFreighters",
        "headline": "Zero-emission robotic cargo vessels complete trans-oceanic autonomous voyage trials",
        "velocity_score": 5300,
        "live_rooms": 1,
        "voice_replies": 30,
        "total_pulses": 330,
        "shares": 4,
        "category": "startup",
        "region": "world"
      }
    ],
    "entertainment": [
      {
        "tag": "#OasisReunionTour",
        "headline": "Liam and Noel Gallagher reconcile for record-breaking 2025/2026 worldwide stadium tour",
        "velocity_score": 9700,
        "live_rooms": 7,
        "voice_replies": 310,
        "total_pulses": 2350,
        "shares": 165,
        "category": "entertainment",
        "region": "world"
      },
      {
        "tag": "#MarvelFatigueReboot",
        "headline": "Disney revamps Marvel Cinematic Universe slowing production pace and bringing back Robert Downey Jr as Doctor Doom",
        "velocity_score": 9400,
        "live_rooms": 6,
        "voice_replies": 270,
        "total_pulses": 2040,
        "shares": 135,
        "category": "entertainment",
        "region": "world"
      },
      {
        "tag": "#DynamicPricingOutrage",
        "headline": "Ticketmaster faces government regulatory hearings over algorithmic surge pricing on concert tickets",
        "velocity_score": 9150,
        "live_rooms": 5,
        "voice_replies": 240,
        "total_pulses": 1820,
        "shares": 120,
        "category": "entertainment",
        "region": "world"
      },
      {
        "tag": "#Gladiator2BoxOffice",
        "headline": "Ridley Scott's historic Roman colosseum sequel opens to massive international theatrical gross",
        "velocity_score": 8900,
        "live_rooms": 4,
        "voice_replies": 210,
        "total_pulses": 1630,
        "shares": 105,
        "category": "entertainment",
        "region": "world"
      },
      {
        "tag": "#StreamingPasswordCrackdown",
        "headline": "Netflix, Disney+, and HBO Max report subscriber gains after eliminating household account sharing",
        "velocity_score": 8680,
        "live_rooms": 4,
        "voice_replies": 185,
        "total_pulses": 1470,
        "shares": 90,
        "category": "entertainment",
        "region": "world"
      },
      {
        "tag": "#WickedMoviePhenomenon",
        "headline": "Universal's musical adaptation starring Cynthia Erivo and Ariana Grande shatters Broadway box office records",
        "velocity_score": 8450,
        "live_rooms": 3,
        "voice_replies": 165,
        "total_pulses": 1340,
        "shares": 78,
        "category": "entertainment",
        "region": "world"
      },
      {
        "tag": "#VideoGameAdaptationsRise",
        "headline": "Success of Fallout, Last of Us, and Mario Bros cements video game IP as Hollywood's premier goldmine",
        "velocity_score": 8250,
        "live_rooms": 3,
        "voice_replies": 150,
        "total_pulses": 1220,
        "shares": 70,
        "category": "entertainment",
        "region": "world"
      },
      {
        "tag": "#HollywoodAIActorRights",
        "headline": "SAG-AFTRA enforces strict digital consent and compensation requirements for synthetic likeness clones",
        "velocity_score": 8050,
        "live_rooms": 3,
        "voice_replies": 135,
        "total_pulses": 1120,
        "shares": 62,
        "category": "entertainment",
        "region": "world"
      },
      {
        "tag": "#GTA6ReleaseHype",
        "headline": "Rockstar Games prepares most anticipated entertainment launch in history with photorealistic Miami open world",
        "velocity_score": 7880,
        "live_rooms": 2,
        "voice_replies": 125,
        "total_pulses": 1030,
        "shares": 55,
        "category": "entertainment",
        "region": "world"
      },
      {
        "tag": "#OscarsBestPictureRace",
        "headline": "Independent cinematic masterpieces clash with studio tentpoles ahead of Academy Awards voting",
        "velocity_score": 7700,
        "live_rooms": 2,
        "voice_replies": 115,
        "total_pulses": 950,
        "shares": 48,
        "category": "entertainment",
        "region": "world"
      },
      {
        "tag": "#AnimeGlobalTheatrical",
        "headline": "Studio Ghibli and Crunchyroll releases dominate international weekend box office charts",
        "velocity_score": 7520,
        "live_rooms": 2,
        "voice_replies": 105,
        "total_pulses": 880,
        "shares": 42,
        "category": "entertainment",
        "region": "world"
      },
      {
        "tag": "#Dune3MessiahConfirmation",
        "headline": "Denis Villeneuve begins pre-production on final chapter of sci-fi desert trilogy",
        "velocity_score": 7350,
        "live_rooms": 2,
        "voice_replies": 95,
        "total_pulses": 810,
        "shares": 36,
        "category": "entertainment",
        "region": "world"
      },
      {
        "tag": "#CelebrityPaparazziLawsuits",
        "headline": "Stars file landmark privacy lawsuits against algorithmic drone tracking agencies",
        "velocity_score": 7180,
        "live_rooms": 1,
        "voice_replies": 90,
        "total_pulses": 750,
        "shares": 30,
        "category": "entertainment",
        "region": "world"
      },
      {
        "tag": "#TrueCrimeDocumentaryBoom",
        "headline": "Investigative documentary filmmakers challenge wrongful convictions leading to real-world retrials",
        "velocity_score": 7020,
        "live_rooms": 1,
        "voice_replies": 85,
        "total_pulses": 700,
        "shares": 26,
        "category": "entertainment",
        "region": "world"
      },
      {
        "tag": "#IMAX70mmFilmRevival",
        "headline": "Directors demand rare 70mm physical film stock screenings following Christopher Nolan's blockbuster success",
        "velocity_score": 6850,
        "live_rooms": 1,
        "voice_replies": 80,
        "total_pulses": 650,
        "shares": 22,
        "category": "entertainment",
        "region": "world"
      },
      {
        "tag": "#BroadwayBoxOfficeRebound",
        "headline": "Original stage musicals and celebrity revivals drive record tourist attendance in New York and West End",
        "velocity_score": 6680,
        "live_rooms": 1,
        "voice_replies": 75,
        "total_pulses": 610,
        "shares": 19,
        "category": "entertainment",
        "region": "world"
      },
      {
        "tag": "#VRImmersiveCinema",
        "headline": "Interactive narrative experiences premiere at Venice and Tribeca film festivals",
        "velocity_score": 6520,
        "live_rooms": 1,
        "voice_replies": 70,
        "total_pulses": 570,
        "shares": 16,
        "category": "entertainment",
        "region": "world"
      },
      {
        "tag": "#HorrorCinemaBoxOffice",
        "headline": "Low-budget psychological horror films deliver 50x return on investment in global theatrical release",
        "velocity_score": 6360,
        "live_rooms": 1,
        "voice_replies": 65,
        "total_pulses": 530,
        "shares": 14,
        "category": "entertainment",
        "region": "world"
      },
      {
        "tag": "#SoundtrackVinylSales",
        "headline": "Orchestral film scores and video game vinyl soundtracks reach top of physical physical music sales",
        "velocity_score": 6200,
        "live_rooms": 1,
        "voice_replies": 60,
        "total_pulses": 500,
        "shares": 12,
        "category": "entertainment",
        "region": "world"
      },
      {
        "tag": "#CannesFilmFestivalJury",
        "headline": "Auteur directors from five continents debut groundbreaking political dramas on the Croisette",
        "velocity_score": 6050,
        "live_rooms": 1,
        "voice_replies": 55,
        "total_pulses": 470,
        "shares": 10,
        "category": "entertainment",
        "region": "world"
      },
      {
        "tag": "#VoiceActorUnionProtection",
        "headline": "Interactive voice artists secure protections against unauthorized video game AI voice duplication",
        "velocity_score": 5900,
        "live_rooms": 1,
        "voice_replies": 50,
        "total_pulses": 440,
        "shares": 8,
        "category": "entertainment",
        "region": "world"
      },
      {
        "tag": "#DocumentaryFundingCrisis",
        "headline": "Independent filmmakers turn to community crowdfunding as traditional public broadcasters slash commissioning",
        "velocity_score": 5750,
        "live_rooms": 1,
        "voice_replies": 45,
        "total_pulses": 410,
        "shares": 7,
        "category": "entertainment",
        "region": "world"
      },
      {
        "tag": "#ComedySpecialStreaming",
        "headline": "Unfiltered standup comedy specials spark international social media debate and viral clip moments",
        "velocity_score": 5600,
        "live_rooms": 1,
        "voice_replies": 40,
        "total_pulses": 380,
        "shares": 6,
        "category": "entertainment",
        "region": "world"
      },
      {
        "tag": "#FilmLocationTaxCreditWar",
        "headline": "UK, Canada, and Eastern Europe compete with aggressive production rebates to attract Hollywood shoots",
        "velocity_score": 5450,
        "live_rooms": 1,
        "voice_replies": 35,
        "total_pulses": 350,
        "shares": 5,
        "category": "entertainment",
        "region": "world"
      },
      {
        "tag": "#HistoricalFilmRestoration",
        "headline": "4K digital restorations of classic international film libraries preserve cinematic heritage",
        "velocity_score": 5300,
        "live_rooms": 1,
        "voice_replies": 30,
        "total_pulses": 320,
        "shares": 4,
        "category": "entertainment",
        "region": "world"
      }
    ],
    "music": [
      {
        "tag": "#KendrickVsDrakeFeud",
        "headline": "Historic hip-hop battle breaks Spotify 24-hour streaming records as diss tracks spark forensic lyrical breakdowns",
        "velocity_score": 9850,
        "live_rooms": 8,
        "voice_replies": 340,
        "total_pulses": 2700,
        "shares": 200,
        "category": "music",
        "region": "world"
      },
      {
        "tag": "#TaylorSwiftErasTourGross",
        "headline": "Eras Tour concludes as highest-grossing music tour in human history surpassing $2 billion in box office revenue",
        "velocity_score": 9600,
        "live_rooms": 7,
        "voice_replies": 300,
        "total_pulses": 2400,
        "shares": 175,
        "category": "music",
        "region": "world"
      },
      {
        "tag": "#AIMusicSunoUdioLawsuit",
        "headline": "Recording Industry Association of America sues AI song generators for mass copyright infringement of sound recordings",
        "velocity_score": 9350,
        "live_rooms": 6,
        "voice_replies": 265,
        "total_pulses": 2080,
        "shares": 145,
        "category": "music",
        "region": "world"
      },
      {
        "tag": "#GrammyNominationsSnubs",
        "headline": "Recording Academy reveals 2026 Grammy nominees sparking heated debates over rap, country, and pop exclusions",
        "velocity_score": 9100,
        "live_rooms": 5,
        "voice_replies": 235,
        "total_pulses": 1810,
        "shares": 125,
        "category": "music",
        "region": "world"
      },
      {
        "tag": "#Spotify1000StreamRule",
        "headline": "Independent musician guilds protest DSP policy demonetizing tracks with under 1,000 annual plays",
        "velocity_score": 8850,
        "live_rooms": 4,
        "voice_replies": 205,
        "total_pulses": 1590,
        "shares": 105,
        "category": "music",
        "region": "world"
      },
      {
        "tag": "#BillieEilishHitHard",
        "headline": "Critically acclaimed third studio album tops charts with intimate, dynamic acoustic and electronic production",
        "velocity_score": 8620,
        "live_rooms": 4,
        "voice_replies": 185,
        "total_pulses": 1440,
        "shares": 90,
        "category": "music",
        "region": "world"
      },
      {
        "tag": "#VinylOutsellsCDs",
        "headline": "Physical vinyl LP sales achieve 18th consecutive year of growth driven by deluxe color editions and gatefolds",
        "velocity_score": 8400,
        "live_rooms": 3,
        "voice_replies": 165,
        "total_pulses": 1310,
        "shares": 78,
        "category": "music",
        "region": "world"
      },
      {
        "tag": "#ElectronicFestivalSafety",
        "headline": "Tomorrowland and Ultra implement advanced acoustic spatial audio stages and harm reduction protocols",
        "velocity_score": 8200,
        "live_rooms": 3,
        "voice_replies": 150,
        "total_pulses": 1200,
        "shares": 68,
        "category": "music",
        "region": "world"
      },
      {
        "tag": "#AutotuneVsPureVocals",
        "headline": "Vocal coaches and pop icons clash over pitch-correction in live television concert broadcasts",
        "velocity_score": 8000,
        "live_rooms": 3,
        "voice_replies": 135,
        "total_pulses": 1100,
        "shares": 60,
        "category": "music",
        "region": "world"
      },
      {
        "tag": "#SpatialAudioDolbyAtmos",
        "headline": "Audio engineers master classic albums in 3D immersive sound for headphone and home cinema playback",
        "velocity_score": 7820,
        "live_rooms": 2,
        "voice_replies": 125,
        "total_pulses": 1010,
        "shares": 52,
        "category": "music",
        "region": "world"
      },
      {
        "tag": "#AfrobeatsGlobalDomination",
        "headline": "Burna Boy, Wizkid, and Tems headline European and US stadium concerts cementing Afrobeats as global force",
        "velocity_score": 7650,
        "live_rooms": 2,
        "voice_replies": 115,
        "total_pulses": 930,
        "shares": 45,
        "category": "music",
        "region": "world"
      },
      {
        "tag": "#ReggaetonStreamingTrends",
        "headline": "Latin urban music accounts for 25% of global top-50 streaming playlists",
        "velocity_score": 7480,
        "live_rooms": 2,
        "voice_replies": 105,
        "total_pulses": 860,
        "shares": 40,
        "category": "music",
        "region": "world"
      },
      {
        "tag": "#AnalogSynthesizerRenaissance",
        "headline": "Moog and Sequential Circuits report record sales of discrete analog hardware synthesizers to producers",
        "velocity_score": 7320,
        "live_rooms": 2,
        "voice_replies": 95,
        "total_pulses": 800,
        "shares": 35,
        "category": "music",
        "region": "world"
      },
      {
        "tag": "#SongwriterRoyaltiesLegislation",
        "headline": "US Copyright Royalty Board increases mechanical royalty rates paid by streaming platforms to lyricists",
        "velocity_score": 7150,
        "live_rooms": 1,
        "voice_replies": 90,
        "total_pulses": 750,
        "shares": 30,
        "category": "music",
        "region": "world"
      },
      {
        "tag": "#KPopGlobalTouring",
        "headline": "Fourth-generation K-Pop groups sell out multi-night stadium residencies in Tokyo, London, and Los Angeles",
        "velocity_score": 6980,
        "live_rooms": 1,
        "voice_replies": 85,
        "total_pulses": 700,
        "shares": 26,
        "category": "music",
        "region": "world"
      },
      {
        "tag": "#HeavyMetalFestivalCrowds",
        "headline": "Wacken and Download festivals draw 100,000 fans as classic metal and modern metalcore thrive",
        "velocity_score": 6820,
        "live_rooms": 1,
        "voice_replies": 80,
        "total_pulses": 660,
        "shares": 22,
        "category": "music",
        "region": "world"
      },
      {
        "tag": "#JazzFusionResurgence",
        "headline": "London and New York underground jazz collectives sell out international concert hall tours",
        "velocity_score": 6650,
        "live_rooms": 1,
        "voice_replies": 75,
        "total_pulses": 620,
        "shares": 19,
        "category": "music",
        "region": "world"
      },
      {
        "tag": "#MasterTapeRestoration",
        "headline": "Archivists use high-resolution laser turntables to recover historic recordings from damaged magnetic tapes",
        "velocity_score": 6500,
        "live_rooms": 1,
        "voice_replies": 70,
        "total_pulses": 580,
        "shares": 16,
        "category": "music",
        "region": "world"
      },
      {
        "tag": "#UndergroundTechnoCulture",
        "headline": "Berlin and Detroit club scenes advocate for strict no-phone policies on dance floors to preserve authenticity",
        "velocity_score": 6350,
        "live_rooms": 1,
        "voice_replies": 65,
        "total_pulses": 540,
        "shares": 14,
        "category": "music",
        "region": "world"
      },
      {
        "tag": "#ModularSynthEurorack",
        "headline": "Boutique hardware builders design generative algorithmic patch modules for ambient soundscapes",
        "velocity_score": 6200,
        "live_rooms": 1,
        "voice_replies": 60,
        "total_pulses": 510,
        "shares": 12,
        "category": "music",
        "region": "world"
      },
      {
        "tag": "#FilmScoreGrammySpotlight",
        "headline": "Hans Zimmer, Ludwig G\u00f6ransson, and Trent Reznor redefine modern cinematic scoring with hybrid synths",
        "velocity_score": 6050,
        "live_rooms": 1,
        "voice_replies": 55,
        "total_pulses": 480,
        "shares": 10,
        "category": "music",
        "region": "world"
      },
      {
        "tag": "#IndieRecordStoresDay",
        "headline": "Independent record stores worldwide celebrate historic sales of limited-run physical vinyl pressings",
        "velocity_score": 5900,
        "live_rooms": 1,
        "voice_replies": 50,
        "total_pulses": 450,
        "shares": 8,
        "category": "music",
        "region": "world"
      },
      {
        "tag": "#ClassicalStreamingGrowth",
        "headline": "High-resolution lossless streaming platforms report double-digit growth among younger classical listeners",
        "velocity_score": 5750,
        "live_rooms": 1,
        "voice_replies": 45,
        "total_pulses": 420,
        "shares": 7,
        "category": "music",
        "region": "world"
      },
      {
        "tag": "#DrumAndBassRenaissance",
        "headline": "Breakbeat and high-BPM jungle music experience massive mainstream chart resurgence worldwide",
        "velocity_score": 5600,
        "live_rooms": 1,
        "voice_replies": 40,
        "total_pulses": 390,
        "shares": 6,
        "category": "music",
        "region": "world"
      },
      {
        "tag": "#AmbientSoundHealing",
        "headline": "Binaural audio and generative sleep frequencies emerge as fastest-growing wellness streaming category",
        "velocity_score": 5450,
        "live_rooms": 1,
        "voice_replies": 35,
        "total_pulses": 360,
        "shares": 5,
        "category": "music",
        "region": "world"
      }
    ]
  }
};

export async function aggregateRadarCategory(
  category: RadarCategoryId,
  region: RadarRegion = 'india'
): Promise<RadarTopicItem[]> {
  try {
    const db = getFirebaseDb();
    const postsRef = collection(db, 'posts');
    const q = query(postsRef, limit(100));
    const snapshot = await getDocs(q);

    const now = Date.now();
    const tagMap: Record<
      string,
      {
        tag: string;
        category: RadarCategoryId;
        region: RadarRegion;
        live_rooms: number;
        voice_replies: number;
        shares: number;
        total_pulses: number;
        hoursElapsed: number;
        headline?: string;
        sample_audio_url?: string;
      }
    > = {};

    // Populate from active posts in Firestore
    snapshot.forEach((docSnap) => {
      const p = docSnap.data();
      if (!p.caption) return;

      const tags = (p.caption.match(/#[a-zA-Z0-9_]+/g) || []) as string[];
      const createdAt = p.createdAt?.seconds
        ? p.createdAt.seconds * 1000
        : now;
      const hoursElapsed = Math.max(0, (now - createdAt) / (1000 * 60 * 60));

      tags.forEach((rawTag) => {
        const tag = rawTag.toLowerCase();
        if (!tagMap[tag]) {
          tagMap[tag] = {
            tag: rawTag,
            category: (p.category as RadarCategoryId) || category || 'trending',
            region: (p.region as RadarRegion) || region || 'india',
            live_rooms: 0,
            voice_replies: 0,
            shares: 0,
            total_pulses: 0,
            hoursElapsed,
            headline: p.caption.slice(0, 100),
            sample_audio_url: p.audioUrl,
          };
        }

        tagMap[tag].voice_replies += p.reverbCount || 0;
        tagMap[tag].shares += (p.orbitedBy?.length || 0) + (p.sharesCount || 0);
        tagMap[tag].total_pulses += p.pulseCount || (p.pulsedBy?.length || 0);
      });
    });

    // Build scored list
    const computedTopics: RadarTopicItem[] = Object.values(tagMap).map((t) => ({
      tag: t.tag,
      category: t.category,
      region: t.region,
      velocity_score: calculateVelocityScore(
        t.live_rooms,
        t.voice_replies,
        t.shares,
        t.total_pulses,
        t.hoursElapsed
      ),
      live_rooms: t.live_rooms,
      voice_replies: t.voice_replies,
      total_pulses: t.total_pulses,
      shares: t.shares,
      headline: t.headline,
      sample_audio_url: t.sample_audio_url,
      updated_at: now,
    }));

    // Combine with seeds for comprehensive discovery
    const seedList = REGIONAL_SEEDS[region]?.[category] || [];
    const combinedMap = new Map<string, RadarTopicItem>();

    computedTopics.forEach((t) => combinedMap.set(t.tag.toLowerCase(), t));
    seedList.forEach((s) => {
      const key = s.tag.toLowerCase();
      if (!combinedMap.has(key)) {
        combinedMap.set(key, { ...s, updated_at: now });
      }
    });

    const results = Array.from(combinedMap.values());
    results.sort((a, b) => b.velocity_score - a.velocity_score);

    const finalTopics = results.slice(0, 50);

    // Cache to Firestore in background
    const docId = getRadarFeedDocId(region, category);
    const docRef = doc(db, 'radar_feeds', docId);
    setDoc(
      docRef,
      cleanFirestoreData({
        category,
        region,
        updated_at: now,
        topics: finalTopics,
      }),
      { merge: true }
    ).catch(() => {});

    return finalTopics;
  } catch (err) {
    console.error('[RadarAggregator] Aggregation failed, using fallback seeds:', err);
    return REGIONAL_SEEDS[region]?.[category] || [];
  }
}

export async function aggregateAllRadarFeeds(): Promise<Record<string, RadarTopicItem[]>> {
  const categories = RADAR_TRACKED_CATEGORIES;
  const results: Record<string, RadarTopicItem[]> = {};

  for (const reg of ['india', 'world'] as const) {
    for (const cat of categories) {
      const feedKey = `${reg}_${cat}`;
      results[feedKey] = await aggregateRadarCategory(cat, reg);
    }
  }

  return results;
}
