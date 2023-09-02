"use client";

import { Ether } from "@/components/Ether";
import EtherscanLink from "@/components/EtherscanLink";
import { PayInput } from "@/components/pay/PayInput";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Stat } from "@/components/ui/stat";
import {
  OrderDirection,
  Participant_OrderBy,
  useParticipantsQuery,
  useProjectsQuery,
} from "@/generated/graphql";
import { useProjectMetadata } from "@/hooks/juicebox/useProjectMetadata";
import { useCountdownToDate } from "@/hooks/useCountdownToDate";
import {
  ETHER_ADDRESS,
  JB_CURRENCIES,
  ONE_ETHER,
  PV2,
} from "@/lib/juicebox/constants";
import {
  formatDiscountRate,
  formatEthAddress,
  formatEther,
  formatRedemptionRate,
  formatReservedRate,
  formatSeconds,
  getNextCycleWeight,
  getPaymentQuoteEth,
  getPaymentQuoteTokens,
  getTokenRedemptionQuoteEth,
} from "@/lib/juicebox/utils";
import { ArrowTrendingUpIcon, ClockIcon } from "@heroicons/react/24/outline";
import {
  jbSingleTokenPaymentTerminalStoreABI,
  jbethPaymentTerminal3_1_2ABI,
  useJbController3_1CurrentFundingCycleOf,
  useJbController3_1ReservedTokenBalanceOf,
  useJbDirectoryPrimaryTerminalOf,
  useJbProjectsOwnerOf,
  useJbTokenStoreTokenOf,
  useJbTokenStoreTotalSupplyOf,
} from "juice-hooks";
import { ArrowRight } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  etherUnits,
  formatUnits,
  parseEther,
  parseUnits,
  zeroAddress,
} from "viem";
import { useContractRead, useToken } from "wagmi";
import { ParticipantsTable } from "./ParticipantsTable";
import { ipfsUriToGatewayUrl } from "@/lib/ipfs";

export default function Page({ params }: { params: { id: string } }) {
  const [formPayAmountA, setFormPayAmountA] = useState<string>("");
  const [formPayAmountB, setFormPayAmountB] = useState<string>("");

  const projectId = BigInt(params.id);
  const { data: address } = useJbProjectsOwnerOf({
    args: [projectId],
  });

  // const {data: controllerAddress} = useJbDirectoryControllerOf({
  //   args: [projectId],
  // })

  // TODO assumes all projects are on Controller v3.1.
  // not a great assumption, will break for older projects, or projects using a newer controller in future.
  const { data: cycleResponse } = useJbController3_1CurrentFundingCycleOf({
    args: [projectId],
  });
  const { data: tokenAddress } = useJbTokenStoreTokenOf({
    args: [projectId],
  });
  const { data: token } = useToken({ address: tokenAddress });

  const { data: primaryTerminalEth } = useJbDirectoryPrimaryTerminalOf({
    args: [projectId, ETHER_ADDRESS],
  });

  const { data: store } = useContractRead({
    address: primaryTerminalEth,
    abi: jbethPaymentTerminal3_1_2ABI,
    functionName: "store",
  });
  const { data: overflowEth } = useContractRead({
    args: [projectId, BigInt(etherUnits.wei), JB_CURRENCIES.ETH],
    address: store,
    abi: jbSingleTokenPaymentTerminalStoreABI,
    functionName: "currentTotalOverflowOf",
  });
  const { data: tokensReserved } = useJbController3_1ReservedTokenBalanceOf({
    args: [projectId],
  });
  const { data: totalTokenSupply } = useJbTokenStoreTotalSupplyOf({
    args: [projectId],
  });

  const totalOutstandingTokens =
    (totalTokenSupply ?? 0n) + (tokensReserved ?? 0n);

  const [cycleData, cycleMetadata] = cycleResponse || [];

  const secondsUntilNextCycle = useCountdownToDate(
    cycleData
      ? new Date(Number(cycleData?.start + cycleData?.duration) * 1000)
      : undefined
  );

  const payAmountAWei = useMemo(() => {
    if (!formPayAmountA) return 0n;
    try {
      return parseEther(`${parseFloat(formPayAmountA)}` as `${number}`);
    } catch {
      return 0n;
    }
  }, [formPayAmountA]);

  // set title
  // TODO, hacky, probably eventually a next-idiomatic way to do this.
  useEffect(() => {
    if (!token?.symbol) return;
    document.title = `$${token?.symbol} | REVNET`;
  }, [token?.symbol]);

  const { data: projects } = useProjectsQuery({
    variables: {
      where: {
        projectId: Number(projectId),
        pv: PV2,
      },
      first: 1,
    },
  });
  const { data: participantsData } = useParticipantsQuery({
    variables: {
      orderBy: Participant_OrderBy.balance,
      orderDirection: OrderDirection.desc,
      where: {
        projectId: Number(projectId),
        pv: PV2,
        balance_gt: "0",
        wallet_not: zeroAddress,
      },
    },
  });

  const { metadataUri, contributorsCount } = projects?.projects?.[0] ?? {};
  const { data: projectMetadata } = useProjectMetadata(metadataUri);
  const { name: projectName, projectTagline, logoUri } = projectMetadata ?? {};

  if (!cycleData || !cycleMetadata) return null;

  const entryTax = cycleData.discountRate;
  const exitTax = cycleMetadata.redemptionRate;
  const devTax = cycleMetadata.reservedRate;

  const ethQuote = getPaymentQuoteEth(ONE_ETHER, {
    weight: cycleData.weight,
    reservedRate: devTax,
  });

  const formTokensQuote =
    payAmountAWei &&
    getPaymentQuoteTokens(payAmountAWei, {
      weight: cycleData.weight,
      reservedRate: devTax,
    });

  // get token redemption quote AS IF the payment goes through and tokens are minted.
  const formRedemptionQuote =
    formTokensQuote &&
    token &&
    overflowEth &&
    totalTokenSupply &&
    tokensReserved
      ? getTokenRedemptionQuoteEth(formTokensQuote.payerTokens, {
          overflowWei: overflowEth + formTokensQuote.ethAmount,
          totalSupply: totalTokenSupply + formTokensQuote.payerTokens,
          redemptionRate: cycleMetadata.redemptionRate,
          tokensReserved,
        })
      : undefined;

  const totalSupplyFormatted =
    totalTokenSupply && token
      ? formatUnits(totalTokenSupply, token.decimals)
      : null;

  // if total supply is less than 1, use a decimal for the exit price base unit (0.1, 0.01, 0.001, etc.)
  // if total supply is greater than 1, use 1 for the exit price base unit.
  const exitFloorPriceUnit =
    totalSupplyFormatted && totalTokenSupply && token
      ? totalTokenSupply < parseUnits("1", token.decimals)
        ? `0.${"0".repeat(
            formatUnits(totalTokenSupply, token.decimals).split(".")[1].length -
              1
          )}1`
        : "1"
      : null;

  const exitFloorPrice =
    token &&
    tokensReserved &&
    totalTokenSupply &&
    overflowEth &&
    exitFloorPriceUnit
      ? getTokenRedemptionQuoteEth(
          parseUnits(exitFloorPriceUnit as `${number}`, token.decimals),
          {
            overflowWei: overflowEth,
            totalSupply: totalTokenSupply,
            redemptionRate: cycleMetadata.redemptionRate,
            tokensReserved,
          }
        ) * 10n
      : null;

  const nextCycleWeight = getNextCycleWeight({
    weight: cycleData.weight,
    discountRate: cycleData.discountRate,
  });

  const nextCycleEthQuote = getPaymentQuoteEth(ONE_ETHER, {
    weight: nextCycleWeight,
    reservedRate: devTax,
  });

  return (
    <div>
      <header>
        <div className="container container-border-x md:border-x flex justify-between md:items-center py-10 md:flex-row flex-col gap-5 ">
          <div>
            <div className="flex items-center gap-2 mb-2">
              {logoUri && (
                <img
                  src={ipfsUriToGatewayUrl(logoUri)}
                  className="rounded-full overflow-hidden h-9 w-9 block"
                  alt={token?.symbol}
                />
              )}
              <h1 className="text-3xl font-regular">{projectName}</h1>
              {token ? (
                <Badge variant="secondary" className="font-normal">
                  <EtherscanLink value={formatEthAddress(token.address)}>
                    ${token?.symbol}
                  </EtherscanLink>
                </Badge>
              ) : null}
            </div>
            <div>
              <span>{projectTagline}</span>
            </div>
            {/* <div className="mb-1">
              <span className="text-4xl font-bold mr-2">
                <Ether wei={ethQuote} />
              </span>
              <span className="text-sm"> / ${token?.symbol}</span>
            </div> */}
            {/* {exitFloorPrice ? (
              <div className="text-sm">
                <span className="font-medium">
                  <Ether wei={exitFloorPrice} />
                </span>{" "}
                / {exitFloorPriceUnit} {token?.symbol} current floor
              </div>
            ) : null} */}
          </div>
          <div className="flex gap-10">
            {typeof overflowEth !== "undefined" ? (
              <Stat label="Backed by">
                <Ether wei={overflowEth} />
              </Stat>
            ) : null}
            {typeof contributorsCount !== "undefined" ? (
              <Stat label="Participants">{contributorsCount}</Stat>
            ) : null}
          </div>
        </div>
      </header>

      <div className="border-y border-y-zinc-400">
        <div className="container container-border-x md:border-x py-6 bg-zinc-100">
          <div className="flex items-center gap-2 mb-3">
            <h2 className="text-base font-medium">Join network</h2>
          </div>
          <form
            action=""
            className="flex justify-between gap-5 flex-col md:flex-row"
          >
            {token ? (
              <div>
                <div className="flex gap-5 items-center flex-col md:flex-row mb-2">
                  <PayInput
                    onChange={(e) => {
                      const value = e.target.value;
                      if (!value) {
                        setFormPayAmountA("");
                        setFormPayAmountB("");
                        return;
                      }

                      const amountWei = parseEther(
                        `${parseFloat(value)}` as `${number}`
                      );
                      const amountBQuote = getPaymentQuoteTokens(amountWei, {
                        weight: cycleData.weight,
                        reservedRate: devTax,
                      });

                      const amountBFormatted = formatUnits(
                        amountBQuote.payerTokens,
                        token?.decimals
                      );

                      setFormPayAmountA(value);
                      setFormPayAmountB(amountBFormatted);
                    }}
                    value={formPayAmountA}
                    className="w-full md:max-w-md"
                    currency="ETH"
                  />
                  <div>
                    <ArrowRight className="h-6 w-6 rotate-90 md:rotate-0" />
                  </div>
                  <PayInput
                    onChange={(e) => {
                      const value = e.target.value;
                      if (!value) {
                        setFormPayAmountA("");
                        setFormPayAmountB("");
                        return;
                      }

                      const amountAQuote = parseEther(
                        `${
                          parseFloat(value) * parseFloat(formatEther(ethQuote))
                        }`
                      );
                      const amountAFormatted = formatEther(amountAQuote, {
                        decimals: 4,
                      });

                      setFormPayAmountA(amountAFormatted);
                      setFormPayAmountB(value);
                    }}
                    value={formPayAmountB}
                    className="w-full md:max-w-md"
                    currency={token?.symbol}
                  />
                </div>
                <div className="flex flex-col gap-1 text-sm">
                  <div>
                    1 {token?.symbol} = <Ether wei={ethQuote} />
                  </div>

                  {secondsUntilNextCycle ? (
                    <div className="font-normal gap-1 text-red-600 flex">
                      <ArrowTrendingUpIcon className="w-4 h-4" />
                      <span className="font-medium">
                        {formatDiscountRate(entryTax)}%
                      </span>{" "}
                      increase in{" "}
                      <span className="font-medium">
                        {formatSeconds(secondsUntilNextCycle)}
                      </span>
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null}

            <Button size="lg" className="h-12">
              Join now
            </Button>
          </form>

          {formTokensQuote && token ? (
            <>
              <div>
                Boost contribution:{" "}
                {formatUnits(formTokensQuote.reservedTokens, token.decimals)}{" "}
                {token.symbol}
              </div>
            </>
          ) : null}

          {formRedemptionQuote ? (
            <div>
              Immediate redemption value: <Ether wei={formRedemptionQuote} />
            </div>
          ) : null}
        </div>
      </div>

      <div className="container container-border-x md:border-x py-10">
        <div className="flex gap-10">
          <Stat label="Entry curve">{formatDiscountRate(entryTax)}%</Stat>
          <Stat label="Exit curve">{formatRedemptionRate(exitTax)}%</Stat>
          <Stat label="Boost">{formatReservedRate(devTax)}%</Stat>
        </div>

        <br />
        <br />

        <div>
          <h2 className="font-medium uppercase text-sm mb-3">Holders</h2>

          {token &&
          participantsData &&
          participantsData.participants.length > 0 ? (
            <ParticipantsTable
              participants={participantsData}
              token={token}
              totalSupply={totalOutstandingTokens}
            />
          ) : (
            "No holders yet."
          )}
        </div>
        {/* 
        <div>
          {totalTokenSupply && tokensReserved && token ? (
            <div>
              {formatUnits(totalTokenSupply, token.decimals)} {token.symbol} in
              circulation (+ {formatUnits(tokensReserved, token.decimals)}{" "}
              reserved)
            </div>
          ) : null}
        </div> */}

        {/* <div>
          Gen {(cycleData.number + 1n).toString()} buy price:{" "}
          {formatEther(nextCycleEthQuote)} ETH / {token?.symbol} (+
          {formatEther(nextCycleEthQuote - ethQuote)} ETH)
        </div> */}
      </div>
    </div>
  );
}
