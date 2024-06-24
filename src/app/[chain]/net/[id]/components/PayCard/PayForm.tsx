import { EthereumAddress } from "@/components/EthereumAddress";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useBoostRecipient } from "@/hooks/useBoostRecipient";
import { useTokenA } from "@/hooks/useTokenA";
import {
  ArrowDownIcon,
  ArrowRightIcon,
  ForwardIcon,
} from "@heroicons/react/24/solid";
import { FixedInt } from "fpnum";
import { getTokenAToBQuote, getTokenBtoAQuote } from "juice-sdk-core";
import {
  useJBContractContext,
  useJBRulesetContext,
  useJBTokenContext,
} from "juice-sdk-react";
import { useState } from "react";
import { formatUnits, parseEther, parseUnits } from "viem";
import { PayDialog } from "./PayDialog";
import { PayInput } from "./PayInput";
import { ButtonWithWallet } from "@/components/ButtonWithWallet";

export function PayForm() {
  const tokenA = useTokenA();
  const { token } = useJBTokenContext();
  const boostRecipient = useBoostRecipient();

  const [amountA, setAmountA] = useState<string>("");
  const [amountB, setAmountB] = useState<string>("");

  const {
    projectId,
    contracts: { primaryNativeTerminal },
  } = useJBContractContext();
  const { ruleset, rulesetMetadata } = useJBRulesetContext();

  const tokenB = token?.data;

  if (!ruleset?.data || !rulesetMetadata?.data || !tokenB) {
    return null;
  }

  const devTax = rulesetMetadata?.data?.reservedRate;

  const _amountA = {
    amount: new FixedInt(parseEther(amountA), tokenA.decimals),
    symbol: tokenA.symbol,
  };
  const _amountB = {
    amount: new FixedInt(parseEther(amountB), tokenB.decimals),
    symbol: tokenB.symbol,
  };

  function resetForm() {
    setAmountA("");
    setAmountB("");
  }

  return (
    <div>
      <div className="flex justify-center items-center flex-col gap-3 mb-5">
        <PayInput
          label="You pay"
          onChange={(e) => {
            const valueRaw = e.target.value;
            setAmountA(valueRaw);

            if (!valueRaw) {
              resetForm();
              return;
            }

            if (!ruleset?.data || !rulesetMetadata?.data) return;

            const value = parseUnits(
              `${parseFloat(valueRaw)}` as `${number}`,
              tokenA.decimals
            );
            const amountBQuote = getTokenAToBQuote(
              new FixedInt(value, tokenA.decimals),
              {
                weight: ruleset.data.weight,
                reservedRate: rulesetMetadata.data.reservedRate,
              }
            );

            setAmountB(formatUnits(amountBQuote.payerTokens, tokenB.decimals));
          }}
          value={amountA}
          currency={tokenA?.symbol}
        />
        <ArrowDownIcon className="h-5 w-5 text-zinc-500" />
        <PayInput
          label="You receive"
          onChange={(e) => {
            const valueRaw = e.target.value;
            setAmountB(valueRaw);

            if (!valueRaw) {
              resetForm();
              return;
            }

            const value = FixedInt.parse(valueRaw, tokenB.decimals);

            if (!ruleset?.data || !rulesetMetadata?.data) return;

            const amountAQuote = getTokenBtoAQuote(value, tokenA.decimals, {
              weight: ruleset.data.weight,
              reservedRate: rulesetMetadata.data.reservedRate,
            });

            setAmountA(amountAQuote.format());
          }}
          value={amountB}
          currency={tokenB?.symbol}
        />
      </div>
      {/* <div className="flex justify-between gap-3 items-center md:items-start flex-col md:flex-row">
          <div className="flex flex-col gap-2 text-sm items-center md:items-start">
            <div>
              1 {token?.symbol} = <Ether wei={ethQuote} />
            </div>

            {secondsUntilNextCycle ? (
              <div className="gap-1 text-orange-600 text-xs flex items-center font-medium">
                <ClockIcon className="w-4 h-4" />
                {entryTax.toPercentage()}% increase scheduled in{" "}
                {formatSeconds(secondsUntilNextCycle)}
              </div>
            ) : null}
          </div>
 
        </div> */}

      {devTax && boostRecipient ? (
        <Tooltip>
          <TooltipTrigger>
            <div className="text-sm flex items-center justify-between gap-1 mb-3">
              <span className="flex items-center gap-1">
                <ForwardIcon className="h-4 w-4 inline-block" />
                <span className="font-medium">
                  {devTax.formatPercentage().toFixed(2)}%
                </span>{" "}
                <span>tokens to </span>
              </span>
              <EthereumAddress address={boostRecipient} short withEnsName />
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <EthereumAddress
              address={boostRecipient}
              short
              withEnsName
              className="font-medium"
            />{" "}
            will receive {devTax.formatPercentage().toFixed(2)}% of new tokens
            minted.
          </TooltipContent>
        </Tooltip>
      ) : null}

      {primaryNativeTerminal?.data ? (
        <PayDialog
          amountA={_amountA}
          amountB={_amountB}
          projectId={projectId}
          primaryTerminalEth={primaryNativeTerminal?.data}
          disabled={!amountA}
        >
          <ButtonWithWallet
            size="lg"
            className="w-full mb-5 min-w-[20%] flex items-center gap-2 hover:gap-[10px] whitespace-nowrap transition-all"
            connectWalletText="Connect wallet to pay"
          >
            Pay and join <ArrowRightIcon className="h-4 w-4" />
          </ButtonWithWallet>
        </PayDialog>
      ) : null}
    </div>
  );
}
