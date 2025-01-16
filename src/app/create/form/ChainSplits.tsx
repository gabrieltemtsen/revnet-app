import { useFormikContext, FieldArray } from "formik";
import { RevnetFormData } from "../types";
import { ChainLogo } from "@/components/ChainLogo";
import { JB_CHAINS } from "juice-sdk-core";
import { Field } from "./Fields";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { twJoin } from "tailwind-merge";

export function ChainSplits({ disabled = false }: { disabled?: boolean }) {
  const { values } = useFormikContext<RevnetFormData>();
  const [selectedStageIdx, setSelectedStageIdx] = useState<number>(0);

  return (
    <div className="mb-10">
      <FieldArray
        name="stages"
        render={() => (
          <div>
            <p className="text-sm text-zinc-500 mb-4">
              Set a unique beneficiary address for each chain.
            </p>
            <div className="flex gap-4 mb-4">
              {values.stages.map((_, idx) => (
                <Button
                  key={idx}
                  variant={selectedStageIdx === idx ? "tab-selected" : "bottomline"}
                  className={twJoin(
                    "text-md text-zinc-400",
                    selectedStageIdx === idx && "text-inherit"
                  )}
                  onClick={() => setSelectedStageIdx(idx)}
                >
                  Stage {idx + 1}
                </Button>
              ))}
            </div>

            {values.chainIds.length > 0 && (
              <div className="flex mb-2 text-sm font-medium text-zinc-500">
                <div className="w-32">Split Number</div>
                <div className="w-32">Split rate (%)</div>
                <div className="flex-1">Beneficiary addresses</div>
              </div>
            )}

            {values.stages[selectedStageIdx]?.splits.map((split, splitIndex) => (
              <div key={splitIndex}>
                <div className="flex items-center text-md text-zinc-600 mt-4">
                  <div className="flex gap-2 items-center w-32 text-sm">
                    <div className="text-zinc-400">Split {splitIndex + 1}</div>
                  </div>
                  <div className="w-32 text-sm text-zinc-600">
                    {split.percentage || "0"}%
                  </div>
                </div>
                {values.chainIds.map((chainId, chainIndex) => (
                  <div key={chainId} className="flex items-center text-md text-zinc-600 mt-2 ml-32">
                    <div className="flex gap-2 items-center w-48 text-sm">
                      <ChainLogo chainId={chainId} width={25} height={25} />
                      <div className="text-zinc-400">{JB_CHAINS[chainId].name}</div>
                    </div>
                    <Field
                      id={`stages.${selectedStageIdx}.splits.${splitIndex}.beneficiary[${chainIndex}].address`}
                      name={`stages.${selectedStageIdx}.splits.${splitIndex}.beneficiary[${chainIndex}].address`}
                      type="text"
                      className="h-9 flex-1"
                      placeholder="0x..."
                      disabled={disabled}
                      required
                      address
                    />
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      />
    </div>
  );
}
