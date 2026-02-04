"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Activity, Bell, RefreshCw, Settings } from "lucide-react"
import { Button } from "@/components/ui/button"

type RunProgress = {
  runId: string
  status: "running" | "success" | "error"
  stage: string
  progress: number
  message?: string | null
  startedAt: string
  updatedAt?: string | null
  completedAt?: string | null
}

export function DashboardHeader() {
  const [run, setRun] = useState<RunProgress | null>(null)
  const [isStarting, setIsStarting] = useState(false)

  const isRunning = run?.status === "running" || isStarting

  async function fetchStatus() {
    try {
      const res = await fetch("/api/internal/cron-status", {
        cache: "no-store",
      })
      const data = await res.json()
      if (data?.run) {
        setRun(data.run)
        if (data.run.status !== "running") {
          setIsStarting(false)
        }
      }
    } catch {
      setIsStarting(false)
    }
  }

  async function triggerSync() {
    if (isRunning) return
    setIsStarting(true)
    fetch("/api/internal/cron-ingest?runType=manual", { method: "POST" })
      .then(() => fetchStatus())
      .catch(() => setIsStarting(false))
  }

  useEffect(() => {
    fetchStatus()
  }, [])

  useEffect(() => {
    if (!isRunning) return
    const id = setInterval(fetchStatus, 4000)
    return () => clearInterval(id)
  }, [isRunning])

  return (
    <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary/20 via-transparent to-emerald-400/20 flex items-center justify-center border border-primary/20">
              <Activity
                className={`w-6 h-6 text-primary ${isRunning ? "animate-[spin_4s_linear_infinite]" : ""}`}
              />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground font-mono tracking-tight">MONEYBOY</h1>
              <p className="text-xs text-muted-foreground font-mono">Financial Intelligence Dashboard</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden md:flex flex-col gap-2 px-3 py-1.5 rounded-lg bg-secondary/50 border border-border min-w-[180px]">
              <div className="flex items-center gap-2">
                <div
                  className={`w-2 h-2 rounded-full ${
                    isRunning ? "bg-primary animate-pulse" : "bg-(--color-success)"
                  }`}
                />
                <span className="text-xs font-mono text-muted-foreground">
                  {isRunning ? "SYNCING" : "LIVE"}
                </span>
              </div>
              {run ? (
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground">
                    <span className="uppercase">{run.stage}</span>
                    <span>{Math.min(run.progress, 100)}%</span>
                  </div>
                  <div className="h-1 w-full rounded-full bg-background/60 overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all"
                      style={{ width: `${Math.min(run.progress, 100)}%` }}
                    />
                  </div>
                  {run.message ? (
                    <div className="text-[10px] text-muted-foreground truncate max-w-[160px]">
                      {run.message}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
            <Button
              variant="secondary"
              className="gap-2"
              onClick={triggerSync}
              disabled={isRunning}
            >
              <RefreshCw className={`w-4 h-4 ${isRunning ? "animate-spin" : ""}`} />
              {isRunning ? "Syncing..." : "Run Sync"}
            </Button>
            <Button asChild variant="secondary">
              <Link href="/search">Search</Link>
            </Button>
            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
              <Bell className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
              <Settings className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>
    </header>
  )
}
