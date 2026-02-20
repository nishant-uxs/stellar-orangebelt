"use client";

import { useEffect, useState } from "react";
import { ContractEvent, startEventPolling } from "@/lib/contract";
import { Activity, Zap } from "lucide-react";

export default function EventFeed() {
  const [events, setEvents] = useState<ContractEvent[]>([]);
  const [isPolling, setIsPolling] = useState(false);

  useEffect(() => {
    setIsPolling(true);
    const stop = startEventPolling((newEvents) => {
      setEvents((prev) => [...newEvents, ...prev].slice(0, 50));
    }, 6000);

    return () => {
      stop();
      setIsPolling(false);
    };
  }, []);

  return (
    <div className="glass p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold flex items-center gap-2">
          <Activity className="w-4 h-4 text-stellar-400" />
          Live Events
        </h3>
        <div className="flex items-center gap-1.5">
          <div
            className={`w-2 h-2 rounded-full ${
              isPolling ? "bg-green-400 animate-pulse" : "bg-gray-500"
            }`}
          />
          <span className="text-xs text-gray-400">
            {isPolling ? "Listening" : "Paused"}
          </span>
        </div>
      </div>

      <div className="space-y-2 max-h-64 overflow-y-auto">
        {events.length === 0 ? (
          <div className="text-center py-6 text-gray-500 text-sm">
            <Zap className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p>Waiting for contract events...</p>
            <p className="text-xs mt-1">
              Events will appear here in real-time
            </p>
          </div>
        ) : (
          events.map((event, i) => (
            <div
              key={`${event.ledger}-${i}`}
              className="p-2 rounded-lg bg-white/5 text-xs space-y-1"
            >
              <div className="flex items-center justify-between">
                <span className="font-medium text-stellar-300">
                  {event.type}
                </span>
                <span className="text-gray-500">
                  Ledger #{event.ledger}
                </span>
              </div>
              <p className="text-gray-400 truncate">
                {JSON.stringify(event.data, (_, v) =>
                  typeof v === "bigint" ? v.toString() : v
                )}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
