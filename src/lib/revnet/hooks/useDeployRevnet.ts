import { UsePrepareContractWriteConfig } from "wagmi";
import {
  revBasicDeployerABI,
  useRevBasicDeployerDeployRevnetWith,
} from "./contract";
import { useCallback } from "react";
import { useToast } from "@/components/ui/use-toast";

export function useDeployRevnet() {
  const { toast } = useToast();
  const { write, data, isError, isLoading } =
    useRevBasicDeployerDeployRevnetWith({
      onError(e) {
        toast({
          title: "Failed to deploy revnet",
          description: e?.message,
        });
      },
    });

  /**
    address _boostOperator,
    JBProjectMetadata memory _revnetMetadata,
    string memory _name,
    string memory _symbol,
    RevnetParams memory _revnetData,

    IJBPaymentTerminal[] memory _terminals,
    BuybackHookSetupData memory _buybackHookSetupData
  */
  const deployRevnet = useCallback(
    (
      args: UsePrepareContractWriteConfig<
        typeof revBasicDeployerABI,
        "deployRevnetWith"
      >["args"]
    ) => {
      write?.({
        args,
      });
    },
    [write]
  );

  return { write: deployRevnet, data, isError, isLoading };
}
