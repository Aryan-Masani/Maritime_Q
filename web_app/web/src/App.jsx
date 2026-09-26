/**
 * App.jsx — Root application with sidebar + tab layout.
 */
import { useState } from "react";
import "./index.css";
import Header from "./components/Header.jsx";
import Sidebar from "./components/Sidebar.jsx";
import ProgressBar from "./components/ProgressBar.jsx";
import ParetoTab from "./tabs/ParetoTab.jsx";
import AllocationTab from "./tabs/AllocationTab.jsx";
import BaselineTab from "./tabs/BaselineTab.jsx";
import ReportTab from "./tabs/ReportTab.jsx";
import FuelPredictionTab from "./tabs/FuelPredictionTab.jsx";
import { useOptimization } from "./hooks/useOptimization.js";

const OPT_TABS = [
  { id: "pareto",     label: "Interactive Pareto Trade-offs"  },
  { id: "allocation", label: "Fleet Allocation & Emissions"   },
  { id: "baseline",   label: "Classical NSGA-II Benchmark"    },
  { id: "report",     label: "Report Export (PDF/Markdown)"   },
];

export default function App() {
  const [activeTab,   setActiveTab]   = useState("fuel");
  const [selectedIdx, setSelectedIdx] = useState(0);

  const {
    status, progress, results, error,
    runOptimization, downloadPdf, downloadMarkdown, fetchDefaultScenario,
  } = useOptimization();

  const isRunning = status === "running";

  return (
    <div className="app-layout">
      <Sidebar
        onRun={runOptimization}
        isRunning={isRunning}
        fetchDefaultScenario={fetchDefaultScenario}
      />

      <main className="main-content">
        <Header />

        {/* Progress bar */}
        {isRunning && <ProgressBar pct={progress.pct} msg={progress.msg} />}

        {/* Error */}
        {error && (
          <div className="error-banner">
            ⚠️ <strong>Optimization Error:</strong> {error}
          </div>
        )}

        {/* Tab nav — fuel always accessible; optimization tabs appear after running */}
        <div className="tabs-nav">
          {results && OPT_TABS.map(t => (
            <button
              key={t.id}
              className={`tab-btn ${activeTab === t.id ? "active" : ""}`}
              onClick={() => setActiveTab(t.id)}
            >
              {t.label}
            </button>
          ))}
          <button
            className={`tab-btn ${activeTab === "fuel" ? "active" : ""}`}
            onClick={() => setActiveTab("fuel")}
          >
            ⛽ Fuel Consumption Prediction
          </button>
        </div>

        {/* Fuel prediction — standalone, no optimization run needed */}
        {activeTab === "fuel" && <FuelPredictionTab />}

        {/* Optimization result tabs */}
        {results && activeTab !== "fuel" && (
          <>
            {activeTab === "pareto" && (
              <ParetoTab
                results={results}
                selectedIdx={selectedIdx}
                setSelectedIdx={setSelectedIdx}
              />
            )}
            {activeTab === "allocation" && (
              <AllocationTab results={results} selectedIdx={selectedIdx} />
            )}
            {activeTab === "baseline" && (
              <BaselineTab results={results} />
            )}
            {activeTab === "report" && (
              <ReportTab
                results={results}
                selectedIdx={selectedIdx}
                downloadPdf={downloadPdf}
                downloadMarkdown={downloadMarkdown}
              />
            )}
          </>
        )}

        {/* Empty state — no results, not running, not on fuel tab */}
        {!results && !isRunning && activeTab !== "fuel" && (
          <div className="empty-state">
            <div className="empty-icon">🚢</div>
            <h2>Maritime Q — Green Fleet Optimizer</h2>
            <p>
              Configure your fleet size, route parameters, bunkering policies, and
              decarbonization targets in the sidebar, then click <strong>Run Green Fleet Optimization</strong> to compute
              the Pareto-optimal deployment strategy using MOQPSO.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
