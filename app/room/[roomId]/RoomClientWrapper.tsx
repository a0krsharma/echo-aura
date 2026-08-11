"use client";

import { useParams } from "next/navigation";
import RoomClient from "./RoomClient";

export default function RoomClientWrapper() {
  const params = useParams();
  const roomId = params.roomId as string;
  return <RoomClient roomId={roomId} />;
}
