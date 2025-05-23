import SubPageHeader from "@/components/SubPageHeader";
import { Button } from "@/components/ui/button";
import { UseFormReturn, useFieldArray, useWatch } from "react-hook-form";
import { BillForm,  BillItemFormData} from "../types"; // Certifique-se que BillItemFormData está atualizada
import { InputPrice } from "../InputPrice";
import { useMemo, useCallback } from "react";
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
  const { control, setValue, watch, getValues } = formObject;

  const {
    fields: billItemFields, // Renomeado para evitar conflito com 'field' dentro do map
    append,
    remove,
  } = useFieldArray({
    control: control,
    name: "billItems",
    keyName: "_id", // Chave interna do React Hook Form
  });

  const billItemsWatcher = useWatch({ control, name: "billItems" }); // Para recalcular total e isDisabled

  const recalculateItemPrice = useCallback((index: number) => {
    const item = getValues(`billItems.${index}` as const);
    if (item) {
      const units = new Decimal(item.units || 0);
      const unitPrice = new Decimal(item.unitPrice || 0);
      setValue(`billItems.${index}.price`, units.mul(unitPrice));
    }
  }, [getValues, setValue]);


  const handleAddItem = () => {
    append({
      id: createId(), // Seu ID único para o item
      name: "",
      units: 1, // Padrão para 1 unidade
      unitPrice: new Decimal(0),
      price: new Decimal(0), // Calculado (1 * 0 = 0 inicialmente)
    } as BillItemFormData); // Cast para o tipo correto
  };

  const total = useMemo(() => {
    return getTotal(watch()); 
  }, [billItemsWatcher, watch("tip"), watch("tax"), getTotal, watch]);

  const isDisabled = useMemo(() => {
    const currentBillItems = watch("billItems") || [];
    const grandTotal = getTotal(watch()); // Usa a função getTotal para consistência
    return (
      currentBillItems.length === 0 ||
      currentBillItems.some(
        (item) =>
          !item.name?.trim() ||
          new Decimal(item.units || 0).lessThanOrEqualTo(0) || // Item deve ter quantidade > 0
          new Decimal(item.unitPrice || 0).lessThan(0) // Preço unitário não pode ser negativo
          // (price será 0 se units ou unitPrice for 0, então não precisa checar price aqui diretamente)
      ) ||
      grandTotal.equals(0)
    );
  }, [billItemsWatcher, getTotal, watch]);

  const tip = watch("tip") || new Decimal(0);
  const tax = watch("tax") || new Decimal(0);

  return (
    <>
      <SubPageHeader
        title="O que tem na conta?"
        description="Adicione tudo que apareceu na conta"
        onBack={() => goBack()}
      />
      <div className="flex flex-col gap-4"> {/* Aumentado o gap geral */}
        {billItemFields.map((field, index) => {
          // field aqui é o objeto do useFieldArray, que inclui a key _id.
          // Para acessar os valores atuais do item, podemos usar watch ou getValues.
          const currentItemValues = watch(`billItems.${index}` as const) || field as unknown as BillItemFormData;
          console.log(`index: ${index}`, currentItemValues)
          return (
            <div
              className="flex flex-col gap-3 p-4 border border-gray-200 rounded-lg shadow-sm bg-white"
              key={field._id} // Chave do React Hook Form
            >
              <div className="flex justify-between items-start gap-2">
                <div className="flex-grow">
                    <label htmlFor={`billItems.${index}.name`} className="text-xs font-medium text-gray-700 mb-1 block">Nome do Item</label>
                    <InputText
                        id={`billItems.${index}.name`}
                        placeholder="Ex: Coca-Cola, Pizza"
                        {...formObject.register(`billItems.${index}.name`)}
                        className="w-full"
                    />
                </div>
                <button
                  type="button"
                  onClick={() => remove(index)}
                  className="mt-5 hover:opacity-80 cursor-pointer text-red-500 hover:text-red-700 p-2" // Melhorado o botão de remover
                  aria-label="Remover item"
                >
                  <img src="/trash.svg" className="size-[30px]" alt="Remover" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
                <div>
                  <label htmlFor={`billItems.${index}.units`} className="text-xs font-medium text-gray-700 mb-1 block">
                    Quantidade
                  </label>
                  <input
                    type="number"
                    id={`billItems.${index}.units`}
                    min="1"
                    {...formObject.register(`billItems.${index}.units`, {
                      valueAsNumber: true,
                      onChange: () => recalculateItemPrice(index),
                    })}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="1"
                  />
                </div>
                <div>
                  <label htmlFor={`billItems.${index}.unitPrice`} className="text-xs font-medium text-gray-700 mb-1 block">
                    Preço Unit. (R$)
                  </label>
                  <InputPrice
                    id={`billItems.${index}.unitPrice`}
                    value={new Decimal(currentItemValues.unitPrice || 0)}
                    onChange={(value) => {
                      setValue(`billItems.${index}.unitPrice`, value || new Decimal(0));
                      recalculateItemPrice(index);
                    }}
                    className="w-full"
                    placeholder="0.00"
                  />
                </div>
                <div className="mt-2 md:mt-0">
                  <label className="text-xs font-medium text-gray-700 mb-1 block">Preço Total (R$)</label>
                  <div className="w-full p-2 border border-gray-200 bg-gray-100 rounded-md text-right h-[42px] flex items-center justify-end">
                    <span className="font-semibold">
                      {(new Decimal(currentItemValues.price || 0)).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        <button
          type="button"
          onClick={handleAddItem}
          className="flex justify-center items-center w-full relative overflow-hidden gap-1.5 p-3 rounded-lg bg-[#f4eeec] border border-[#d1d5dc] hover:bg-[#ebe2df] transition-colors cursor-pointer"
        >
          <img src="/add.svg" alt="Adicionar" className="size-4" />
          <p className="flex-grow-0 text-base font-medium text-center text-[#1d293d]">
            Adicionar Item
          </p>
        </button>
        <div className="h-[1px] bg-[#D1D5DC] -mx-[calc(50vw-50%)] mt-5" /> {/* Ajuste para centralizar divisor */}

        <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-4">
          <div>
            <p className="text-sm text-left text-[#1e2939] mb-1">Gorjeta:</p>
            <InputPrice
              value={tip}
              onChange={(value) => setValue("tip", value || new Decimal(0))}
              className="w-full"
              placeholder="0.00"
            />
          </div>
          <div>
            <p className="text-sm text-left text-[#1e2939] mb-1">Taxa (ex: serviço):</p>
            <InputPrice
              value={tax}
              onChange={(value) => setValue("tax", value || new Decimal(0))}
              className="w-full"
              placeholder="0.00"
            />
          </div>
        </div>

        <div className="flex flex-row gap-2 items-end justify-end mt-4">
          <p className="text-sm text-right text-[#1e2939]">
            Total Geral: <span className="font-medium text-[#6a7282]">R$ </span>
          </p>
          <p className="text-2xl font-medium text-right text-[#1e2939] -mb-0.5">
            {total.toFixed(2)}
          </p>
        </div>
      </div>
      <Button className="w-full mt-8" onClick={goForward} disabled={isDisabled}>
        <span>Continuar</span>
      </Button>
    </>
  );
};