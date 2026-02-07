"use client"
import { CalculationResult, WindowInput } from "@/types";
import { calculateMaterials } from "@/utils/calculations";
import { useState } from "react";
import { Calculator } from "lucide-react";
import WindowForm from "@/lib/components/WindowForm";
import ResultsDisplay from "@/lib/components/ResultsDisplay";
export default function Home() {
  const [result, setResult] = useState<CalculationResult | null>(null);

  const handleCalculate = (input: WindowInput) => {
    const calculationResult = calculateMaterials(input);
    setResult(calculationResult);
  };

  const handleReset = () => {
    setResult(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <header className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Calculator className="w-10 h-10 text-slate-700" />
            <h1 className="text-4xl font-bold text-slate-800">
              Aluminium Window Stock Estimation
            </h1>
          </div>
          <p className="text-slate-600 text-lg">
            Calculate material requirements and optimize stock usage for 27mm
            Domal sections
          </p>
        </header>

        <div className="grid lg:grid-cols-2 gap-6">
          <div className="lg:col-span-1">
            <WindowForm onCalculate={handleCalculate} onReset={handleReset} />
          </div>

          <div className="lg:col-span-1 lg:sticky lg:top-4 lg:self-start">
            {result && <ResultsDisplay result={result} />}
          </div>
        </div>
      </div>
    </div>
  );
}
