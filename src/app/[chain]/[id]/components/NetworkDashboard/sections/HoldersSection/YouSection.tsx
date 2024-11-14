import { NativeTokenValue } from "@/components/NativeTokenValue";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useEtherPrice } from "@/hooks/useEtherPrice";
import { formatPortion } from "@/lib/utils";
import { formatEther } from "juice-sdk-core";
import { UserTokenBalanceDatum } from "../../../UserTokenBalanceCard/UserTokenBalanceDatum";
import { useSuckersTokenRedemptionQuote } from "../../../UserTokenBalanceCard/useSuckersTokenRedemptionQuote";
import { useSuckersUserTokenBalance } from "../../../UserTokenBalanceCard/useSuckersUserTokenBalance";

export function YouSection({ totalSupply }: { totalSupply: bigint }) {
  const balanceQuery = useSuckersUserTokenBalance();
  const balances = balanceQuery?.data;
  const totalBalance =
    balances?.reduce((acc, curr) => {
      return acc + curr.balance.value;
    }, 0n) || 0n;
  // console.log("totalBalance", totalBalance)

  const redeemQuoteQuery = useSuckersTokenRedemptionQuote(totalBalance);
  const { data: ethPrice, isLoading: isEthLoading } = useEtherPrice();
  const loading =
    balanceQuery.isLoading || redeemQuoteQuery.isLoading || isEthLoading;

  const redeemQuote = redeemQuoteQuery?.data ?? 0n;

  console.log(redeemQuoteQuery)

  return (
    <div className="grid grid-cols-2 max-w-xl text-sm">
      {/* Left Column */}
      <div className="space-y-4">
        <div>
          <dt className="font-medium text-zinc-900">Balance</dt>
          <dd className="text-zinc-600">
            <UserTokenBalanceDatum />
          </dd>
        </div>
        <div>
          <dt className="font-medium text-zinc-900">Current cash out value</dt>
          <dd className="text-zinc-600">
            <Tooltip>
              <TooltipTrigger>
                {!loading && ethPrice
                  ? `$${(
                      Number(formatEther(redeemQuote ?? 0n)) * ethPrice
                    ).toFixed(2)}`
                  : "..."}
              </TooltipTrigger>
              <TooltipContent>
                <div className="flex flex-col space-y-2">
                  <NativeTokenValue wei={redeemQuote} decimals={8} />
                  <span className="font-medium italic">WIP breakdown</span>
                </div>
              </TooltipContent>
            </Tooltip>
          </dd>
        </div>
      </div>

      {/* Right Column */}
      <div className="space-y-4">
        <div>
          <dt className="font-medium text-zinc-900">Ownership</dt>
          <dd className="text-zinc-600">
            {formatPortion(totalBalance, totalSupply)} %
          </dd>
        </div>
        <div>
          <dt className="font-medium text-zinc-900">Current loan potential</dt>
          <dd className="text-zinc-600">$100.50</dd>
        </div>
      </div>
    </div>
  );
}
