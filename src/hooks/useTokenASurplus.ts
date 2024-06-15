import { NATIVE_TOKEN } from "juice-sdk-core";
import {
  useJBContractContext,
  useReadJbMultiTerminalCurrentSurplusOf,
} from "juice-sdk-react";

export function useNativeTokenSurplus() {
  const {
    projectId,
    contracts: { primaryNativeTerminal },
  } = useJBContractContext();

  return useReadJbMultiTerminalCurrentSurplusOf({
    address: primaryNativeTerminal.data ?? undefined,
    args: [projectId, 18n, BigInt(NATIVE_TOKEN)],
    watch: true,
    staleTime: 10_000, // 10 seconds
  });
}
