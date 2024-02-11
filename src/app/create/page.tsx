"use client";

import EtherscanLink from "@/components/EtherscanLink";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { NATIVE_TOKEN } from "@/lib/juicebox/constants";
import { jbMultiTerminalAddress } from "@/lib/juicebox/hooks/contract";
import { revBasicDeployerABI } from "@/lib/revnet/hooks/contract";
import { useDeployRevnet } from "@/lib/revnet/hooks/useDeployRevnet";
import { ArrowLeftIcon, CheckCircleIcon } from "@heroicons/react/24/solid";
import {
  FieldArray,
  FieldArrayRenderProps,
  FieldAttributes,
  Form,
  Formik,
  Field as FormikField,
  useFormikContext,
} from "formik";
import {
  DecayRate,
  JBProjectMetadata,
  RedemptionRate,
  ReservedRate,
} from "juice-sdk-core";
import Link from "next/link";
import { useEffect, useState } from "react";
import { twMerge } from "tailwind-merge";
import { Chain, parseUnits, zeroAddress } from "viem";
import { optimismSepolia } from "viem/chains";
import {
  Address,
  UsePrepareContractWriteConfig,
  sepolia,
  useNetwork,
  useWaitForTransaction,
} from "wagmi";

const defaultStageData = {
  priceCeilingIncreasePercentage: "",
  priceCeilingIncreaseFrequency: "",
  priceFloorTaxIntensity: "",

  boostPercentage: "",
  boostDuration: "",
};

type RevnetFormData = {
  name: string;
  tagline: string;

  tokenName: string;
  tokenSymbol: string;

  premintTokenAmount: string;
  initialOperator: string;
  stages: (typeof defaultStageData)[];
};

const DEFAULT_FORM_DATA: RevnetFormData = {
  name: "",
  tagline: "",

  tokenName: "",
  tokenSymbol: "",

  premintTokenAmount: "",
  initialOperator: "",

  stages: [],
};

function Field(props: FieldAttributes<any>) {
  if (props.suffix || props.prefix) {
    return (
      <div className="relative w-full">
        {props.prefix ? (
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <span className="text-zinc-500 sm:text-sm">{props.prefix}</span>
          </div>
        ) : null}
        <FormikField
          {...props}
          className={twMerge(
            "flex w-full rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-sm ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-zinc-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-800 dark:bg-zinc-950 dark:ring-offset-zinc-950 dark:placeholder:text-zinc-400 dark:focus-visible:ring-zinc-300",
            props.className
          )}
        />
        {props.suffix ? (
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
            <span className="text-zinc-500 sm:text-sm">{props.suffix}</span>
          </div>
        ) : null}
      </div>
    );
  }
  return (
    <FormikField
      {...props}
      className={twMerge(
        "flex w-full rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-sm ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-zinc-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-800 dark:bg-zinc-950 dark:ring-offset-zinc-950 dark:placeholder:text-zinc-400 dark:focus-visible:ring-zinc-300",
        props.className
      )}
    />
  );
}

function FieldGroup(
  props: FieldAttributes<any> & { label: string; description?: string }
) {
  return (
    <div className="mb-3">
      <label
        htmlFor={props.name}
        className="block text-sm font-medium leading-6 mb-1"
      >
        {props.label}
      </label>
      <Field {...props} />
      {props.description ? (
        <p className="text-sm text-zinc-500 mt-1">{props.description}</p>
      ) : null}
    </div>
  );
}

function DetailsPage() {
  return (
    <div>
      <h2 className="text-2xl font-medium mb-7">Name the Revnet</h2>

      <FieldGroup id="name" name="name" label="Name" />
      <FieldGroup id="tagline" name="tagline" label="Tagline" />
    </div>
  );
}

function TokensPage() {
  return (
    <div>
      <h2 className="text-2xl font-medium mb-2">Name the Revnet's token</h2>
      <p className="text-zinc-600 text-sm mb-7">
        The Revnet's token represents a member's ownership. It's an{" "}
        <span className="whitespace-nowrap">ERC-20</span> token and can be
        traded on any exchange.
      </p>

      <FieldGroup id="tokenName" name="tokenName" label="Token name" />
      <FieldGroup id="tokenSymbol" name="tokenSymbol" label="Token symbol" />
    </div>
  );
}

function AddStageDialog({
  children,
  onSave,
}: {
  children: React.ReactNode;
  onSave: (newStage: typeof defaultStageData) => void;
}) {
  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add stage</DialogTitle>
        </DialogHeader>
        <div className="my-8">
          <Formik
            initialValues={defaultStageData}
            onSubmit={(values, { setSubmitting }) => {
              onSave(values);
              setSubmitting(false);
            }}
          >
            {({ isSubmitting }) => (
              <Form>
                <FieldGroup
                  id="boostDuration"
                  name="boostDuration"
                  label="Stage duration"
                  suffix="days"
                  description="Leave blank to make stage indefinite."
                  type="number"
                />
                <DialogFooter>
                  <DialogClose asChild>
                    <Button type="submit">Add stage</Button>
                  </DialogClose>
                </DialogFooter>
              </Form>
            )}
          </Formik>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ConfigPage() {
  const { values, setFieldValue } = useFormikContext<RevnetFormData>();

  return (
    <div>
      <h2 className="text-2xl font-medium mb-2">Configure Stages</h2>
      <p className="text-zinc-600 text-sm mb-7">
        Configure how your Revnet should evolve over time. Your configuration is
        locked forever and can't be changed.
      </p>

      <div className="mb-5">
        <h3>Setup</h3>
        <FieldGroup
          id="boostOperator"
          name="boostOperator"
          label="Operator"
          placeholder="0x"
        />
        <FieldGroup
          className="flex-1"
          id="premintTokenAmount"
          name="premintTokenAmount"
          label="Premint"
          description="Premint some tokens to the Boost Operator upon deployment."
          suffix="tokens"
        />
      </div>

      {/* <div>
        {values.stages
          .filter((stage) => stage !== defaultStageData)
          .map((stage, idx) => {
            return (
              <div key={idx}>
                Stage {idx + 1} - {stage.boostDuration} days
              </div>
            );
          })}
      </div> */}

      <FieldArray
        name="stages"
        render={() => (
          <div>
            {values.stages.map((stage, index) => (
              <div key={index}>{stage.boostDuration} days</div>
            ))}

            <AddStageDialog
              onSave={(newStage) => {
                // Here you can add the new item to the Formik array
                console.log("NEW STAGE", newStage);
                setFieldValue("stages", [...values.stages, newStage]);
              }}
            >
              <Button>Add stage</Button>
            </AddStageDialog>
          </div>
        )}
      />

      {/* <h3 className="text-lg font-medium mb-1 mt-7">Incentives</h3>

      <div className="mb-4">
        <div className="text-sm font-medium mb-2">Price ceiling</div>
        <div className="flex gap-2 items-center text-sm text-zinc-600 italic">
          <label
            htmlFor="priceCeilingIncreasePercentage"
            className="whitespace-nowrap"
          >
            Raise ceiling by
          </label>
          <Field
            id="priceCeilingIncreasePercentage"
            name="priceCeilingIncreasePercentage"
            className="h-9"
            suffix="%"
          />
          <label htmlFor="priceCeilingIncreaseFrequency">every</label>
          <Field
            id="priceCeilingIncreaseFrequency"
            name="priceCeilingIncreaseFrequency"
            className="h-9"
            type="number"
          />
          days.
        </div>
      </div>
      <FieldGroup
        id="priceFloorTaxIntensity"
        name="priceFloorTaxIntensity"
        label="Exit tax"
        suffix="%"
      />

      <div>
        <h3 className="text-lg font-medium mb-1 mt-7">Token split</h3>
        <p className="text-zinc-600 text-sm mb-7">
          Send a portion of new token purchases to an Operator. The Operator
          could be a core team, airdrop stockpile, staking rewards contract, or
          something else.
        </p>

        <div className="flex gap-2 justify-between">
          <FieldGroup
            className="flex-1"
            id="boostPercentage"
            name="boostPercentage"
            label="Split rate"
            description="Send a percentage of new tokens to the Operator."
            suffix="%"
          />
        </div>
      </div> */}
    </div>
  );
}

function ReviewPage() {
  const { values } = useFormikContext<RevnetFormData>();
  console.log(values);
  return (
    <div>
      <h2 className="text-2xl font-medium mb-7">Review and deploy</h2>

      <div className="mb-5">
        <div className="px-4 sm:px-0">
          <h3 className="text-base font-semibold leading-7 text-zinc-900">
            General
          </h3>
        </div>

        <div className="mt-6 border-t border-zinc-100">
          <dl className="divide-y divide-zinc-100">
            <div className="px-4 py-6 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
              <dt className="text-sm font-medium leading-6 text-zinc-900">
                Revnet name
              </dt>
              <dd className="mt-1 text-sm leading-6 text-zinc-700 sm:col-span-2 sm:mt-0">
                {values.name}
              </dd>
            </div>
            <div className="px-4 py-6 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
              <dt className="text-sm font-medium leading-6 text-zinc-900">
                Revnet tagline
              </dt>
              <dd className="mt-1 text-sm leading-6 text-zinc-700 sm:col-span-2 sm:mt-0">
                {values.tagline}
              </dd>
            </div>
            <div className="px-4 py-6 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
              <dt className="text-sm font-medium leading-6 text-zinc-900">
                Token
              </dt>
              <dd className="mt-1 text-sm leading-6 text-zinc-700 sm:col-span-2 sm:mt-0">
                {values.tokenName} (${values.tokenSymbol})
              </dd>
            </div>
          </dl>
        </div>
      </div>
      {/*
      <div className="mb-5">
        <div className="px-4 sm:px-0">
          <h3 className="text-base font-semibold leading-7 text-zinc-900">
            Configuration
          </h3>
        </div>

        <div className="mt-6 border-t border-zinc-100">
          <dl className="divide-y divide-zinc-100">
            <div className="px-4 py-6 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
              <dt className="text-sm font-medium leading-6 text-zinc-900">
                Raise ceiling by
              </dt>
              <dd className="mt-1 text-sm leading-6 text-zinc-700 sm:col-span-2 sm:mt-0">
                {values.priceCeilingIncreasePercentage}% every{" "}
                {values.priceCeilingIncreaseFrequency} days
              </dd>
            </div>
            <div className="px-4 py-6 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
              <dt className="text-sm font-medium leading-6 text-zinc-900">
                Exit tax
              </dt>
              <dd className="mt-1 text-sm leading-6 text-zinc-700 sm:col-span-2 sm:mt-0">
                {values.priceFloorTaxIntensity}%
              </dd>
            </div>
          </dl>
        </div>
      </div>

      <div>
        <div className="px-4 sm:px-0">
          <h3 className="text-base font-semibold leading-7 text-zinc-900">
            Boost
          </h3>
        </div>

        <div className="mt-6 border-t border-zinc-100">
          <dl className="divide-y divide-zinc-100">
            <div className="px-4 py-6 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
              <dt className="text-sm font-medium leading-6 text-zinc-900">
                Boost operator
              </dt>
              <dd className="mt-1 text-sm leading-6 text-zinc-700 sm:col-span-2 sm:mt-0 overflow-ellipsis">
                <EthereumAddress address={values.boostOperator} />
              </dd>
            </div>
            <div className="px-4 py-6 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
              <dt className="text-sm font-medium leading-6 text-zinc-900">
                Premint
              </dt>
              <dd className="mt-1 text-sm leading-6 text-zinc-700 sm:col-span-2 sm:mt-0 overflow-ellipsis">
                {values.premintTokenAmount} {values.tokenSymbol}
              </dd>
            </div>
            <div className="px-4 py-6 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
              <dt className="text-sm font-medium leading-6 text-zinc-900">
                Boost amount
              </dt>
              <dd className="mt-1 text-sm leading-6 text-zinc-700 sm:col-span-2 sm:mt-0">
                {values.boostPercentage}%
              </dd>
            </div>
            <div className="px-4 py-6 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
              <dt className="text-sm font-medium leading-6 text-zinc-900">
                Boost duration
              </dt>
              <dd className="mt-1 text-sm leading-6 text-zinc-700 sm:col-span-2 sm:mt-0">
                {values.boostDuration} days
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  );*/}
    </div>
  );
}

const pages = [
  { name: "Details", component: DetailsPage },
  { name: "Token", component: TokensPage },
  { name: "Stage", component: ConfigPage },
  { name: "Review", component: ReviewPage },
];

function CreatePage({
  onFormChange,
  isLoading,
}: {
  onFormChange: (data: RevnetFormData) => void;
  isLoading: boolean;
}) {
  const [page, setPage] = useState(0);
  const CurrentPage = pages[page].component;
  const prevPage = pages[page - 1];
  const nextPage = pages[page + 1];

  const { values } = useFormikContext<RevnetFormData>();
  useEffect(() => {
    onFormChange(values);
  });

  return (
    <div className="container">
      <Form>
        <div className="max-w-lg rounded-lg shadow-lg my-24 p-10 mx-auto border border-zinc-100">
          <CurrentPage />
          <div className="flex justify-between mt-7">
            {prevPage ? (
              <Button
                variant="link"
                onClick={(ev) => {
                  ev.stopPropagation();
                  ev.preventDefault();
                  setPage(page - 1);
                }}
              >
                <ArrowLeftIcon className="h-3 w-3 mr-1" />
                Back
              </Button>
            ) : (
              <div />
            )}
            {nextPage ? (
              <Button
                onClick={(ev) => {
                  ev.stopPropagation();
                  ev.preventDefault();
                  setPage(page + 1);
                }}
              >
                Next: {nextPage.name}
              </Button>
            ) : (
              <Button type="submit">Deploy Revnet</Button>
            )}
          </div>
        </div>
      </Form>
    </div>
  );
}

function parseDeployData(
  formData: RevnetFormData,
  extra: {
    metadataCid: string;
    chainId: Chain["id"] | undefined;
  }
): UsePrepareContractWriteConfig<
  typeof revBasicDeployerABI,
  "deployRevnetWith"
>["args"] {
  const now = Math.floor(Date.now() / 1000);

  // 1 token per eth
  const initialIssuanceRateEth = "1";

  const stageConfig = formData.stages.map((stage, idx) => {
    return {
      startsAtOrAfter:
        idx === 0
          ? 1
          : Number(formData.stages[idx - 1].boostDuration) * 86400 + now, // seconds // seconds
      operatorSplitRate:
        Number(ReservedRate.parse(stage.boostPercentage, 4).val) / 100,
      initialIssuanceRate: parseUnits(initialIssuanceRateEth, 18), // 1 token per eth
      priceCeilingIncreaseFrequency:
        Number(stage.priceCeilingIncreaseFrequency) * 86400, // seconds
      priceCeilingIncreasePercentage:
        Number(DecayRate.parse(stage.priceCeilingIncreasePercentage, 9).val) /
        100,
      priceFloorTaxIntensity:
        Number(RedemptionRate.parse(stage.priceFloorTaxIntensity, 4).val) / 100, //
    };
  });

  return [
    formData.tokenName,
    formData.tokenSymbol,
    extra.metadataCid,
    {
      baseCurrency: Number(BigInt(NATIVE_TOKEN)),
      initialOperator: (formData.initialOperator as Address) ?? zeroAddress,
      premintTokenAmount: parseUnits(formData.premintTokenAmount, 18),
      stageConfigurations: stageConfig,
    },
    [
      {
        terminal:
          jbMultiTerminalAddress[
            extra.chainId as typeof sepolia.id | typeof optimismSepolia.id
          ],
        tokensToAccept: [NATIVE_TOKEN],
      },
    ],
    {
      hook: zeroAddress,
      poolConfigurations: [
        // {
        //   token: zeroAddress,
        //   fee: 0,
        //   twapSlippageTolerance: 0,
        //   twapWindow: 0,
        // },
      ],
    },
  ];
}

async function pinProjectMetadata(metadata: JBProjectMetadata) {
  const { Hash } = await fetch("/api/ipfs/pinJson", {
    method: "post",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(metadata),
  }).then((res) => res.json());

  return Hash;
}

export default function Page() {
  const [formData, setFormData] = useState(DEFAULT_FORM_DATA);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const { chain } = useNetwork();
  const { write, data } = useDeployRevnet();
  const { data: txData, isSuccess } = useWaitForTransaction({
    hash: data?.hash,
  });

  async function deployProject() {
    // Upload metadata
    const metadataCid = await pinProjectMetadata({
      name: formData.name,
      projectTagline: formData.tagline,
      description: "",
      logoUri: "",
    });

    const deployData = parseDeployData(formData, {
      metadataCid,
      chainId: chain?.id,
    });

    console.log("deployData::", deployData);

    // Deploy onchain
    write?.(deployData);
  }

  if (isSuccess && txData) {
    console.log("useDeployRevnet::tx success", txData.logs);
    const projectIdHex = txData.logs[0].topics[3];
    if (!projectIdHex) {
      console.warn("useDeployRevnet::fail::no project id");

      return (
        <div className="container">
          <div className="max-w-lg rounded-lg shadow-lg my-24 p-10 mx-auto border border-zinc-100">
            Something went wrong.{" "}
            <EtherscanLink type="tx" value={data?.hash}>
              {" "}
              Check the transaction on Etherscan
            </EtherscanLink>
            .
          </div>
        </div>
      );
    }

    const projectId = BigInt(projectIdHex).toString(10);
    console.warn("useDeployRevnet::success::project id", projectId);

    return (
      <div className="container">
        <div className="max-w-lg rounded-lg shadow-lg my-24 p-10 mx-auto border border-zinc-100 flex flex-col items-center">
          <CheckCircleIcon className="h-9 w-9 text-green-600 mb-4" />
          <h1 className="text-4xl mb-10">Your Revnet is Live</h1>
          <p>
            <Link href={`/net/${projectId}`}>
              <Button size="lg">Go to Revnet</Button>
            </Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <Formik
      initialValues={DEFAULT_FORM_DATA}
      onSubmit={() => {
        console.log("submitting");
        setIsLoading(true);
        try {
          deployProject?.();
        } catch (e) {
          setIsLoading(false);
          console.error(e);
        }
      }}
    >
      <CreatePage onFormChange={setFormData} isLoading={isLoading} />
    </Formik>
  );
}
