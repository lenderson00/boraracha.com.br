import SubPageHeader from "@/components/SubPageHeader";
import { Button } from "@/components/ui/button";
import { UseFormReturn, useFieldArray } from "react-hook-form";
import { BillForm } from "../types";
import { InputPrice } from "../InputPrice";
import { useMemo } from "react";
import { InputText } from "../InputText";
import { createId, getTotal } from "../utils";
import Decimal from "decimal.js";

export const ReceiptItems = ({
  goBack,
  goForward,
  formObject,
}: {
  goBack: () => void;
  goForward: () => void;
  formObject: UseFormReturn<BillForm>;
}) => {
  const { fields, append, remove } = useFieldArray({
    control: formObject.control,
    name: "billItems",
    keyName: "_id",
  });

  const handleAddItem = () => {
    append({ name: "", price: new Decimal(0), id: createId() });
  };

  const total = useMemo(() => {
    return getTotal(formObject.watch());
  }, [formObject.watch()]);

  const isDisabled = useMemo(() => {
    const products = formObject.watch("billItems") || [];
    return (
      products.length === 0 ||
      products.some((field) => field.name === "") ||
      total.equals(0)
    );
  }, [formObject.watch("billItems"), total]);

  const tip = useMemo(() => {
    return formObject.watch("tip");
  }, [formObject.watch("tip")]);

  const tax = useMemo(() => {
    return formObject.watch("tax");
  }, [formObject.watch("tax")]);

  return (
    <>
      <SubPageHeader
        title="O que tem na conta?"
         description="Adicione tudo que apareceu na conta"
        onBack={() => goBack()}
      />
      <div className="flex flex-col gap-3">
        {fields.map((field, index) => (
          <div
            className="flex justify-start items-center relative gap-2"
            key={field._id}
          >
            <InputText
              placeholder="Item name"
              {...formObject.register(`billItems.${index}.name`)}
            />
            <InputPrice
              value={field.price}
              onChange={(value) => {
                formObject.setValue(`billItems.${index}.price`, value);
              }}
            />
            <button
              onClick={() => remove(index)}
              className=" hover:opacity-80 cursor-pointer"
            >
              <img src="/trash.svg" className="size-[42px]" />
            </button>
          </div>
        ))}
        <button
          onClick={handleAddItem}
          className="flex justify-start items-center w-full relative overflow-hidden gap-1.5 p-3 rounded-lg bg-[#f4eeec] border border-[#d1d5dc] hover:bg-[#ebe2df] transition-colors cursor-pointer"
        >
          <img src="/add.svg" className="size-4" />
          <p className="flex-grow-0  text-base font-medium text-center text-[#1d293d]">
            Adicionar Item
          </p>
        </button>
        <div className="h-[1px] bg-[#D1D5DC] -mx-[100vw] mt-5" />
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-2">
            <p className="text-sm text-left text-[#1e2939]">Gorjeta:</p>
            <InputPrice
              value={tip}
              onChange={(value) => formObject.setValue("tip", value)}
              className="w-full"
              placeholder="0.00"
            />
          </div>
          <div className="flex flex-col gap-2">
            <p className="text-sm text-left text-[#1e2939]">Taxa:</p>
            <InputPrice
              value={tax}
              onChange={(value) => formObject.setValue("tax", value)}
              className="w-full"
              placeholder="0.00"
            />
          </div>
        </div>
        <div className="flex flex-row gap-2 items-end justify-end">
          <p className="text-sm text-right text-[#1e2939]">
            Total: <span className="font-medium text-[#6a7282]">R$ </span>
          </p>
          <p className="text-2xl font-medium text-right text-[#1e2939] -mb-0.5">
            {total.toFixed(2)}
          </p>
        </div>
      </div>
      <Button className="w-full mt-6" onClick={goForward} disabled={isDisabled}>
        <span>Continuar</span>
      </Button>
    </>
  );
};
