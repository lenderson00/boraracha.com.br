import SubPageHeader from "@/components/SubPageHeader";
import { Button } from "@/components/ui/button";
import { UseFormReturn, useFieldArray } from "react-hook-form";
import { BillForm } from "../types";
import { InputText } from "../InputText";
import { useMemo } from "react";
import { createId } from "../utils";

const TinyButton = ({
  isActive,
  onClick,
  children,
  className,
}: {
  isActive?: boolean;
  onClick: () => void;
  children?: React.ReactNode;
  className?: string;
}) => {
  return (
    <button
      onClick={onClick}
      className={`flex justify-center w-fit items-center h-[30px] truncate relative overflow-hidden gap-1.5 p-3 rounded border-[0.7px] border-[#d1d5dc] cursor-pointer transition-colors ${
        isActive ? "bg-[#6a2000]" : "bg-white"
      } ${className}`}
    >
      <p
        className={`flex-grow-0 flex-shrink-0 text-sm text-center ${
          isActive ? "text-white" : "text-[#1e2939]"
        }`}
      >
        {children}
      </p>
    </button>
  );
};

export const PeopleAndSplit = ({
  goBack,
  goForward,
  formObject,
}: {
  goBack: () => void;
  goForward: () => void;
  formObject: UseFormReturn<BillForm>;
}) => {
  const {
    fields: people,
    append,
    remove,
  } = useFieldArray({
    control: formObject.control,
    name: "people",
    keyName: "_id",
  });

  const { fields: products, update: updateProduct } = useFieldArray({
    control: formObject.control,
    name: "billItems",
    keyName: "_id",
  });

  const handleAddPerson = () => {
    append({ name: "", id: createId() });
  };

  const isDisabled = useMemo(() => {
    const people = formObject.watch("people") || [];
    const products = formObject.watch("billItems") || [];
    const splitEvenly = formObject.watch("splitEvenly");

    if (people.length === 0 || people.some((field) => field.name === "")) {
      return true;
    }

    if (splitEvenly) {
      return false;
    }

    return products.some((product) => !product.assignedTo?.length);
  }, [
    formObject.watch("people"),
    formObject.watch("billItems"),
    formObject.watch("splitEvenly"),
  ]);

  const splitEvenly = formObject.watch("splitEvenly");

  const handleSplitEvenlyToggle = () => {
    if (splitEvenly) {
      formObject.setValue(
        "billItems",
        products.map((product) => ({
          ...product,
          assignedTo: [],
        }))
      );
    }
    formObject.setValue("splitEvenly", !splitEvenly);
  };

  return (
    <>
      <SubPageHeader
        title="Quem vai dividir?"
        description="Digite todos os nomes e atribua os itens"
        onBack={() => goBack()}
      />
      <div className="flex flex-col gap-3 w-full">
        {people.map((person, index) => (
          <div
            className="flex justify-start items-center relative gap-2"
            key={person._id}
          >
            <InputText
              placeholder="Person name"
              className="w-full max-w-[300px]"
              {...formObject.register(`people.${index}.name`)}
            />

            <button
              onClick={() => {
                remove(index);
              }}
              className=" hover:opacity-80 cursor-pointer"
            >
              <img src="/trash.svg" className="size-[42px]" />
            </button>
          </div>
        ))}
        <button
          onClick={handleAddPerson}
          className="flex justify-start items-center w-full relative overflow-hidden gap-1.5 p-3 rounded-lg bg-[#f4eeec] border border-[#d1d5dc] hover:bg-[#ebe2df] transition-colors cursor-pointer"
        >
          <img src="/add.svg" className="size-4" />

          <p className="flex-grow-0  text-base font-medium text-center text-[#1d293d]">
            Adicionar Pessoa
          </p>
        </button>
        <div className="h-[1px] bg-[#D1D5DC] -mx-[100vw] mt-5" />

        <div className="flex flex-row justify-between items-center">
          <p className="text-xl font-medium text-left text-[#1e2939]">
            Atribuir Itens
          </p>
          <TinyButton
            isActive={splitEvenly}
            className="w-[98px]"
            onClick={handleSplitEvenlyToggle}
          >
            Dividir igualmente
          </TinyButton>
        </div>
        <div className="flex flex-col gap-2 w-full">
          {products?.map((product, productIndex) => {
            return (
              <div key={productIndex} className="w-full max-w-[350px]">
                <div className="grid grid-cols-[1fr_auto] px-4 py-3 rounded-lg bg-[#F7F5F5] border border-[#d1d5dc]">
                  <div className="space-y-3">
                    <p className="text-base text-[#1e2939]">{product.name}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {people.map((person, personIndex) => {
                        const personName = formObject.watch(
                          `people.${personIndex}.name`
                        );
                        return (
                          <TinyButton
                            key={person._id}
                            isActive={product.assignedTo?.includes(person.id)}
                            onClick={() => {
                              const currentAssigned = product.assignedTo || [];
                              const isAssigned = currentAssigned.includes(
                                person.id
                              );
                              if (!isAssigned) {
                                formObject.setValue("splitEvenly", false);
                              }
                              // If the person is already assigned, remove them from the assignedTo array
                              // Otherwise, add them to the assignedTo array
                              const newAssigned = isAssigned
                                ? currentAssigned.filter(
                                    (id) => id !== person.id
                                  )
                                : [...currentAssigned, person.id];

                              console.log(
                                "isAssigned",
                                isAssigned,
                                newAssigned
                              );
                              updateProduct(productIndex, {
                                ...product,
                                assignedTo: newAssigned,
                              });
                            }}
                            className="rounded-lg"
                          >
                            {personName}
                          </TinyButton>
                        );
                      })}
                    </div>
                  </div>
                  <div className="text-base font-medium text-right">
                    <span className="text-[#6a7282]">$</span>
                    <span className="text-[#1e2939] whitespace-nowrap">
                      {product.price.toString()}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <Button className="w-full mt-6" onClick={goForward} disabled={isDisabled}>
        <span>Continuar</span>
      </Button>
    </>
  );
};
