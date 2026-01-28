"use client";

import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";
import axios from "axios";
import { RetellWebClient } from "retell-client-js-sdk";
import { Card, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import MiniLoader from "../loaders/mini-loader/miniLoader";
import { Interview } from "@/types/interview";
import { useResponses } from "@/contexts/responses.context";
import { useTabSwitchPrevention, TabSwitchWarning } from "./tabSwitchPrevention";

/* ---------------- TYPES ---------------- */

type InterviewProps = {
  interview: Interview;
};

type Transcript = {
  role: "agent" | "user";
  content: string;
};

type FaceExpressions = {
  neutral: number;
  happy: number;
  sad: number;
  angry: number;
  fearful: number;
  disgusted: number;
  surprised: number;
};

/* ---------------- SETUP ---------------- */

const webClient = new RetellWebClient();

export default function Call({ interview }: InterviewProps) {
  const { createResponse } = useResponses();
  const { tabSwitchCount } = useTabSwitchPrevention();

  const faceapiRef = useRef<any>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [loading, setLoading] = useState(false);
  const [isStarted, setIsStarted] = useState(false);
  const [isEnded, setIsEnded] = useState(false);
  const [isCalling, setIsCalling] = useState(false);

  const [lastAgentText, setLastAgentText] = useState("");
  const [lastUserText, setLastUserText] = useState("");

  const [emotion, setEmotion] = useState("");
  const [emotions, setEmotions] = useState<string[]>([]);
  const [callId, setCallId] = useState("");

  /* ---------------- FACE API LOAD ---------------- */

  useEffect(() => {
    let mounted = true;

    const initFaceApi = async () => {
      if (typeof window === "undefined") return;

      const faceapi = await import("face-api.js");
      faceapiRef.current = faceapi;

      const MODEL_URL = "/models";
      await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
      await faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL);

      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (mounted && videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    };

    initFaceApi();

    return () => {
      mounted = false;
      if (videoRef.current?.srcObject) {
        (videoRef.current.srcObject as MediaStream)
          .getTracks()
          .forEach((t) => t.stop());
      }
    };
  }, []);

  /* ---------------- FACE DETECTION ---------------- */

  useEffect(() => {
    if (!faceapiRef.current || !videoRef.current || !canvasRef.current) return;

    const faceapi = faceapiRef.current;
    const video = videoRef.current;
    const canvas = canvasRef.current;

    const displaySize = { width: video.width, height: video.height };
    faceapi.matchDimensions(canvas, displaySize);

    const interval = setInterval(async () => {
      const detection = await faceapi
        .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
        .withFaceExpressions();

      if (detection?.expressions) {
        const expressions =
          detection.expressions as unknown as FaceExpressions;

        const [emo] = Object.entries(expressions).reduce<[string, number]>(
          (a, b) => (b[1] > a[1] ? b : a),
          ["neutral", 0]
        );

        setEmotion(emo);
      } else {
        setEmotion("");
      }

      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        if (detection) {
          const resized = faceapi.resizeResults(detection, displaySize);
          faceapi.draw.drawDetections(canvas, resized);
          faceapi.draw.drawFaceExpressions(canvas, resized);
        }
      }
    }, 300);

    return () => clearInterval(interval);
  }, []);

  /* ---------------- EMOTION STORAGE ---------------- */

  useEffect(() => {
    if (emotion && !emotions.includes(emotion)) {
      setEmotions((prev) => [...prev, emotion]);
    }
  }, [emotion]);

  useEffect(() => {
    if (isEnded && callId) {
      createResponse({
        interview_id: interview.id,
        call_id: callId,
        tab_switch_count: tabSwitchCount,
        emotion: emotions.join(", "),
        is_ended: true,
      });
    }
  }, [isEnded]);

  /* ---------------- RETELL EVENTS ---------------- */

  useEffect(() => {
    const onStarted = () => setIsCalling(true);
    const onEnded = () => {
      setIsCalling(false);
      setIsEnded(true);
    };
    const onUpdate = (u: any) => {
      if (!u.transcript) return;
      const map: Record<string, string> = {};
      u.transcript.forEach((t: Transcript) => (map[t.role] = t.content));
      setLastAgentText(map.agent || "");
      setLastUserText(map.user || "");
    };

    webClient.on("call_started", onStarted);
    webClient.on("call_ended", onEnded);
    webClient.on("update", onUpdate);

    return () => {
      webClient.off("call_started", onStarted);
      webClient.off("call_ended", onEnded);
      webClient.off("update", onUpdate);
    };
  }, []);

  /* ---------------- START CALL ---------------- */

  const startConversation = async () => {
    setLoading(true);

    const res = await axios.post("/api/register-call", {
      dynamic_data: {
        questions: interview.questions.map((q) => q.question).join(", "),
      },
      interviewer_id: interview.interviewer_id,
    });

    await webClient.startCall({
      accessToken: res.data.registerCallResponse.access_token,
    });

    setCallId(res.data.registerCallResponse.call_id);
    setIsStarted(true);
    setLoading(false);
  };

  /* ---------------- UI ---------------- */

  return (
    <div className="flex justify-center min-h-screen bg-gray-100">
      {isStarted && <TabSwitchWarning />}

      <Card className="w-[90%] max-w-[1000px] p-4 mt-6">
        <CardHeader className="items-center">
          <CardTitle>{interview.name}</CardTitle>
        </CardHeader>

        {!isStarted && !isEnded && (
          <Button onClick={startConversation} disabled={loading}>
            {loading ? <MiniLoader /> : "Start Interview"}
          </Button>
        )}

        {isStarted && !isEnded && (
          <div className="grid grid-cols-2 gap-6 mt-6">
            <div className="p-4 bg-white rounded">{lastAgentText}</div>
            <div className="p-4 bg-white rounded">{lastUserText}</div>
          </div>
        )}

        {isEnded && (
          <div className="text-center font-semibold mt-6">
            Interview Completed
          </div>
        )}
      </Card>

      {/* Camera + Emotion */}
      <div className="fixed right-4 top-4 bg-white p-3 rounded shadow">
        <video ref={videoRef} width={260} height={180} autoPlay muted />
        <canvas ref={canvasRef} width={260} height={180} />
        <div className="text-sm text-center mt-1">
          Emotion: <b>{emotion || "None"}</b>
        </div>
      </div>
    </div>
  );
}
