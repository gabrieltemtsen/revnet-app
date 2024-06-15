import { formatUnits, getTokenRedemptionQuoteEth } from "juice-sdk-core";
import {
  useJBContractContext,
  useJBRulesetContext,
  useJBTokenContext,
  useReadJbControllerPendingReservedTokenBalanceOf,
  useReadJbTokensTotalSupplyOf,
} from "juice-sdk-react";
import { parseUnits } from "viem";
import { useNativeTokenSurplus } from "./useTokenASurplus";

/**
 * @todo not sure if this works properly
 */
export function useExitFloorPrice() {
  const { projectId } = useJBContractContext();
  const { token } = useJBTokenContext();
  const { rulesetMetadata } = useJBRulesetContext();
  const { data: nativeTokenSurplus } = useNativeTokenSurplus();
  const { data: totalTokenSupply } = useReadJbTokensTotalSupplyOf({
    args: [projectId],
  });
  const { data: tokensReserved } = useReadJbControllerPendingReservedTokenBalanceOf(
    {
      args: [projectId],
    }
  );

  const totalSupplyFormatted =
    totalTokenSupply && token?.data
      ? formatUnits(totalTokenSupply, token.data.decimals)
      : null;

  const exitLeadingZeroes =
    totalSupplyFormatted?.split(".")[1]?.match(/^0+/)?.[0]?.length ?? 0;

  // if total supply is less than 1, use a decimal for the exit price base unit (0.1, 0.01, 0.001, etc.)
  // if total supply is greater than 1, use 1 for the exit price base unit.
  const exitFloorPriceUnit =
    totalSupplyFormatted && totalTokenSupply && token?.data
      ? totalTokenSupply < parseUnits("1", token.data.decimals)
        ? `0.${"0".repeat(exitLeadingZeroes)}1`
        : "1"
      : null;

  const exitFloorPrice =
    token?.data &&
    typeof tokensReserved !== "undefined" &&
    totalTokenSupply &&
    nativeTokenSurplus &&
    exitFloorPriceUnit &&
    rulesetMetadata?.data
      ? getTokenRedemptionQuoteEth(
          parseUnits(exitFloorPriceUnit as `${number}`, token.data.decimals),
          {
            overflowWei: nativeTokenSurplus,
            totalSupply: totalTokenSupply,
            redemptionRate: rulesetMetadata?.data?.redemptionRate.value,
            tokensReserved,
          }
        ) * 10n
      : null;

  return exitFloorPrice;
}
