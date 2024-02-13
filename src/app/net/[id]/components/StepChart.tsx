import { MAX_RULESET_COUNT } from "@/app/constants";
import { Button } from "@/components/ui/button";
import { useNativeTokenSymbol } from "@/hooks/useNativeTokenSymbol";
import { formatDistance } from "date-fns";
import {
  DecayRate,
  Ether,
  JBRulesetData,
  ONE_ETHER,
  ReservedRate,
  RulesetWeight,
  getNextRulesetWeight,
  getPrevRulesetWeight,
  getTokenBtoAQuote,
} from "juice-sdk-core";
import {
  useJBContractContext,
  useJBRulesetContext,
  useJbRulesetsRulesetsOf,
} from "juice-sdk-react";
import { useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Dot,
  DotProps,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { twJoin } from "tailwind-merge";

function generateDateRange(startDate: Date, endDate: Date, resolution: number) {
  const dateRange = [];
  const interval = (endDate.getTime() - startDate.getTime()) / (resolution - 1);

  for (let i = 0; i < resolution; i++) {
    const date = new Date(startDate.getTime() + i * interval);
    dateRange.push(date);
  }

  return dateRange;
}

const steps = 50;

const CustomTooltip = ({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{
    value: number;
  }>;
  label?: string;
}) => {
  const nativeTokenSymbol = useNativeTokenSymbol();
  if (active) {
    const value = payload?.[0].value ?? 0;

    return (
      <div className="rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-sm text-zinc-950 shadow-md ">
        <p>
          {value} {nativeTokenSymbol}
        </p>
      </div>
    );
  }

  return null;
};

const CustomizedDot = (
  props: DotProps & {
    payload?: {
      groupIdx: number;
      price: number;
    };
    currentPrice: Ether;
    datapointIndex: number;
  }
) => {
  const { cx, cy, payload } = props;
  if (
    payload?.groupIdx === props.datapointIndex &&
    `${payload?.price}` === props.currentPrice.toFloat().toFixed(4)
  ) {
    return (
      <Dot
        cx={cx}
        cy={cy}
        r={7}
        fill="#f97316"
        stroke="#fff"
        strokeWidth={2}
        className="animate-pulse"
      />
    );
  }

  return null;
};

const CustomizedXTick = (props: {
  x?: number;
  y?: number;
  payload?: {
    index: number;
  };
  ruleset: JBRulesetData;
  renderData: { groupIdx: number; fc: number; date: Date }[];
}) => {
  const { x, y, payload } = props;
  const d = props.renderData[payload?.index ?? 1];
  if (d.groupIdx !== 0) return;

  return (
    <g transform={`translate(${x},${y})`}>
      <text
        x={0}
        y={0}
        dy={16}
        textAnchor="middle"
        fill="#71717A"
        fontSize={"0.75rem"}
      >
        {formatDistance(
          Number(props.ruleset.start) * 1000 +
            Number(props.ruleset.duration) * (d.fc - 2) * 1000,
          new Date(),
          {
            addSuffix: true,
          }
        )}
      </text>
    </g>
  );
};

const INITIAL_SELECTED_STAGE = -1;

const StepChart = () => {
  const { projectId } = useJBContractContext();
  const { ruleset: currentRuleset, rulesetMetadata } = useJBRulesetContext();

  const [selectedStage, setSelectedStage] = useState<number>(
    INITIAL_SELECTED_STAGE
  );

  const { data: rulesets } = useJbRulesetsRulesetsOf({
    args: [projectId, 0n, BigInt(MAX_RULESET_COUNT)],
    select(data) {
      return data.map((ruleset) => {
        return {
          ...ruleset,
          weight: new RulesetWeight(ruleset.weight),
          decayRate: new DecayRate(ruleset.decayRate),
        };
      });
    },
  });

  console.log(rulesets, "rulesets");

  const stages: JBRulesetData[] = rulesets?.reverse() ?? [];
  const nextStageIdx = stages.findIndex(
    (stage) => stage.start > Date.now() / 1000
  );
  const currentStageIdx = nextStageIdx - 1;

  // set the selected stage to the currently active stage
  useEffect(() => {
    if (selectedStage === INITIAL_SELECTED_STAGE) {
      setSelectedStage(currentStageIdx === -1 ? 0 : currentStageIdx);
      return;
    }
  }, [currentStageIdx, selectedStage]);

  const ruleset = { data: stages[selectedStage] }; // the selected ruleset

  const currentFcStart = ruleset?.data?.start;
  const startBuffer = currentFcStart ?? 0n - (ruleset?.data?.duration ?? 0n);
  const currentFcEnd =
    ruleset?.data?.start ?? 0n + (ruleset?.data?.duration ?? 0n);
  const nextFcEnd = currentFcEnd + (ruleset?.data?.duration ?? 0n);
  const nextNextFcEnd = nextFcEnd + (ruleset?.data?.duration ?? 0n);

  const prevWeight = new RulesetWeight(
    getPrevRulesetWeight({
      weight: ruleset?.data?.weight.val ?? 0n,
      decayRate: ruleset?.data?.decayRate.val ?? 0n,
    })
  );
  const nextWeight = new RulesetWeight(
    getNextRulesetWeight({
      weight: ruleset?.data?.weight.val ?? 0n,
      decayRate: ruleset?.data?.decayRate.val ?? 0n,
    })
  );
  const nextNextWeight = new RulesetWeight(
    getNextRulesetWeight({
      weight: nextWeight.val ?? 0n,
      decayRate: ruleset?.data?.decayRate.val ?? 0n,
    })
  );

  const prevPrice = getTokenBtoAQuote(new Ether(ONE_ETHER), 18, {
    weight: prevWeight ?? new RulesetWeight(0n),
    reservedRate: rulesetMetadata?.data?.reservedRate ?? new ReservedRate(0n),
  });

  const currentPrice = getTokenBtoAQuote(new Ether(ONE_ETHER), 18, {
    weight: ruleset?.data?.weight ?? new RulesetWeight(0n),
    reservedRate: rulesetMetadata?.data?.reservedRate ?? new ReservedRate(0n),
  });
  const nextPrice = getTokenBtoAQuote(new Ether(ONE_ETHER), 18, {
    weight: nextWeight,
    reservedRate: rulesetMetadata?.data?.reservedRate ?? new ReservedRate(0n),
  });
  const nextNextPrice = getTokenBtoAQuote(new Ether(ONE_ETHER), 18, {
    weight: nextNextWeight,
    reservedRate: rulesetMetadata?.data?.reservedRate ?? new ReservedRate(0n),
  });

  const timeElapsed = Math.abs(Date.now() - Number(currentFcStart) * 1000);
  const percentElapsed =
    timeElapsed / (Number(ruleset?.data?.duration ?? 0n) * 1000);

  const datapointIndex = Math.floor(percentElapsed * steps);

  const renderData = useMemo(() => {
    return [
      ...generateDateRange(
        new Date(Number(startBuffer) * 1000),
        new Date(Number(currentFcStart) * 1000),
        steps
      )
        .map((d, i) => {
          return {
            fc: 1,
            groupIdx: i,
            date: d,
            price: prevPrice.toFloat().toFixed(4),
          };
        })
        .slice(steps * 0.6, steps),
      ...generateDateRange(
        new Date(Number(currentFcStart) * 1000),
        new Date(Number(currentFcEnd) * 1000),
        steps
      ).map((d, i) => {
        return {
          fc: 2,

          groupIdx: i,
          date: d,
          price: currentPrice.toFloat().toFixed(4),
        };
      }),
      ...generateDateRange(
        new Date(Number(currentFcEnd) * 1000),
        new Date(Number(nextFcEnd) * 1000),
        steps
      ).map((d, i) => {
        return {
          fc: 3,

          groupIdx: i,
          date: d,
          price: nextPrice.toFloat().toFixed(4),
        };
      }),
      ...generateDateRange(
        new Date(Number(nextFcEnd) * 1000),
        new Date(Number(nextNextFcEnd) * 1000),
        steps
      ).map((d, i) => {
        return {
          fc: 4,

          groupIdx: i,
          date: d,
          price: nextNextPrice.toFloat().toFixed(4),
        };
      }),
    ];
  }, [
    currentPrice,
    nextPrice,
    nextNextPrice,
    prevPrice,
    currentFcEnd,
    currentFcStart,
    nextFcEnd,
    nextNextFcEnd,
    startBuffer,
  ]);

  return (
    <div>
      <div className="mb-2 flex gap-2">
        {stages?.map((ruleset, idx) => {
          return (
            <Button
              variant="ghost"
              className={twJoin(
                "text-sm font-normal",
                selectedStage === idx && "font-medium underline"
              )}
              key={ruleset.id.toString() + idx}
              onClick={() => setSelectedStage(idx)}
            >
              Stage {idx + 1}{" "}
              {idx === currentStageIdx && (
                <span className="rounded-full h-2 w-2 bg-orange-400 border-[2px] border-orange-200 ml-1"></span>
              )}
            </Button>
          );
        })}
      </div>

      <div style={{ height: 300 }}>
        <ResponsiveContainer height="100%" width="100%">
          <AreaChart data={renderData}>
            <defs>
              <linearGradient id="price" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#34d399" stopOpacity={0.05} />
                <stop offset="95%" stopColor="#34d399" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis
              tickLine={false}
              tick={
                ruleset?.data ? (
                  <CustomizedXTick
                    renderData={renderData}
                    ruleset={ruleset.data}
                  />
                ) : undefined
              }
              interval={0}
              tickCount={renderData.length}
              stroke="#d4d4d8"
            />
            <CartesianGrid strokeDasharray="3 3" vertical={false} />

            <YAxis
              orientation="right"
              tickLine={false}
              axisLine={false}
              type="number"
              domain={[(prevPrice.toFloat() * 0.99).toFixed(6), "dataMax"]}
              fontSize={"0.75rem"}
              fill="#71717A"
              // hide
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="stepBefore"
              dataKey="price"
              stroke="#34d399"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#price)"
              dot={
                <CustomizedDot
                  datapointIndex={datapointIndex}
                  currentPrice={currentPrice as Ether}
                />
              }
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default StepChart;
