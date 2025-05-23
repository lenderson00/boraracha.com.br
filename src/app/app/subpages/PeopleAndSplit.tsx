import SubPageHeader from "@/components/SubPageHeader";
import { Button } from "@/components/ui/button";
import { UseFormReturn, useFieldArray } from "react-hook-form";
import { BillForm, BillItemFormData, PersonFormData } from "../types";
import { InputText } from "../InputText"; // Assumindo que este é um componente de input de texto estilizado
import { useMemo, useCallback } from "react";
import { createId } from "../utils";
import { cn } from "@/lib/utils";
import Decimal from "decimal.js";
import { toast } from "sonner";
import { QuantityStepper } from "@/components/ui/stepper";

// TinyButton component (permanece o mesmo, mas adicione type="button")
const TinyButton = ({
  isActive,
  onClick,
  children,
  className,
  disabled, // Nova propriedade
}: {
  isActive?: boolean;
  onClick: () => void;
  children?: React.ReactNode;
  className?: string;
  disabled?: boolean; // Nova propriedade
}) => {
  return (
    <button
      type="button" // Importante para evitar submissão de formulário
      onClick={onClick}
      disabled={disabled}
      className={`flex justify-center w-fit items-center h-[30px] truncate relative overflow-hidden gap-1.5 px-3 py-1.5 font-bold rounded border-[0.7px] border-[#d1d5dc] cursor-pointer transition-colors
        ${disabled ? "bg-gray-200 text-gray-500 cursor-not-allowed" : isActive ? "bg-emerald-600 text-white " : "bg-white text-[#1e2939] hover:bg-gray-50"}
        ${className}`}
    >
      <p
        className={`flex-grow-0 flex-shrink-0 text-sm text-center ${
          disabled ? "" : isActive ? "text-white" : "text-[#1e2939]"
        } truncate`} // Adicionado truncate para nomes longos
        title={typeof children === 'string' ? children : undefined} // Tooltip para nomes longos
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
  const { control, setValue, watch, getValues } = formObject;

  const {
    fields: people,
    append: appendPerson,
    remove: removePerson,
  } = useFieldArray({
    control,
    name: "people",
    keyName: "_id",
  });

  const { fields: products, update: updateProduct } = useFieldArray({
    control,
    name: "billItems",
    keyName: "_id",
  });

  const handleAddPerson = () => {
    appendPerson({ name: "", id: createId() } as PersonFormData);
  };

  const splitEvenly = watch("splitEvenly");
  const watchedPeople = watch("people") || [];
  const watchedBillItems = watch("billItems") || [];

  const getAssignedQuantityForItem = useCallback((product: BillItemFormData): number => {
    return (product.assignedTo || []).reduce(
      (sum, assignment) => sum + (assignment.quantity || 0),
      0
    );
  }, []);

  const isDisabled = useMemo(() => {
    // ... (lógica de isDisabled permanece a mesma da versão anterior,
    // garantindo que os itens estejam completamente atribuídos se não for splitEvenly)
    if (watchedPeople.length === 0 || watchedPeople.some((p) => !p.name?.trim())) {
      return true;
    }
    if (splitEvenly) {
      return false;
    }
    for (const product of watchedBillItems) {
      const productUnits = product.units ?? 0;
      if (productUnits > 0) {
        const assignedTo = product.assignedTo || [];
        if (assignedTo.length === 0 && (product.price instanceof Decimal ? product.price : new Decimal(product.price || 0)).greaterThan(0)) return true;
        const totalAssignedQuantity = getAssignedQuantityForItem(product);
        if (totalAssignedQuantity !== productUnits) return true;
        if (assignedTo.some(a => a.quantity <= 0)) return true;
      } else if ((product.price instanceof Decimal ? product.price : new Decimal(product.price || 0)).greaterThan(0)) {
        if (!product.assignedTo || product.assignedTo.length === 0) return true;
      }
    }
    return false;
  }, [watchedPeople, watchedBillItems, splitEvenly, getAssignedQuantityForItem]);

  const handleSplitEvenlyToggle = () => {
    // ... (lógica permanece a mesma)
    const currentSplitEvenly = watch("splitEvenly");
    if (!currentSplitEvenly) {
      const updatedBillItems = products.map((product) => ({
        ...product,
        assignedTo: [],
      }));
      setValue("billItems", updatedBillItems as any);
    }
    setValue("splitEvenly", !currentSplitEvenly);
  };

  const handlePersonAssignmentToggle = (
    productIndex: number,
    product: BillItemFormData,
    personId: string
  ) => {
    setValue("splitEvenly", false);
    const currentAssignments = product.assignedTo || [];
    const assignmentIndex = currentAssignments.findIndex((a) => a.personId === personId);
    const totalUnitsForProduct = product.units ?? 0;
    const currentlyAssignedUnits = getAssignedQuantityForItem(product);

    let newAssignments;
    if (assignmentIndex > -1) {
      newAssignments = currentAssignments.filter((a) => a.personId !== personId);
    } else {
      // Antes de adicionar, verificar se há espaço
      if (currentlyAssignedUnits >= totalUnitsForProduct && totalUnitsForProduct > 0) {
        toast.error("Todas as unidades deste item já foram atribuídas. Não é possível adicionar mais pessoas.");
        return;
      }
      const defaultQuantity = totalUnitsForProduct === 1 ? 1 : (totalUnitsForProduct > 0 ? 1 : 0);
      // Se adicionar esta pessoa com defaultQuantity = 1 exceder o limite, ajuste ou avise.
      // Por simplicidade, vamos assumir que o usuário ajustará a quantidade depois.
      // Ou, poderíamos atribuir Math.min(1, totalUnitsForProduct - currentlyAssignedUnits) se > 0.
      newAssignments = [...currentAssignments, { personId, quantity: defaultQuantity }];
    }
    updateProduct(productIndex, { ...product, assignedTo: newAssignments });
  };

  const handleQuantityChange = (
    productIndex: number,
    productData: BillItemFormData,
    personId: string,
    newQuantityStr: string,
    targetInput?: HTMLInputElement // Para reverter o valor no input se inválido
  ) => {
    let newQuantity = parseInt(newQuantityStr, 10);
    const assignments = productData.assignedTo || [];
    const personCurrentAssignment = assignments.find(a => a.personId === personId);
    const previousQuantity = personCurrentAssignment?.quantity || 0;

    // Se o campo for limpo ou não for um número válido (exceto se for limpo)
    if (isNaN(newQuantity) && newQuantityStr.trim() !== "") {
        if (targetInput) targetInput.value = previousQuantity.toString(); // Reverte
        return;
    }
    if (newQuantityStr.trim() === "") newQuantity = 0; // Tratar campo vazio como 0 para possível remoção

    const totalUnits = productData.units || 0;
    const otherPeopleTotalQuantity = assignments
      .filter((a) => a.personId !== personId)
      .reduce((sum, a) => sum + a.quantity, 0);

    if (newQuantity < 0) { // Não permitir quantidade negativa
        toast.error("A quantidade não pode ser negativa.");
        if (targetInput) targetInput.value = previousQuantity.toString(); // Reverte
        return;
    }

    if (otherPeopleTotalQuantity + newQuantity > totalUnits) {
      toast.error(`Quantidade excede o total de ${totalUnits} unidades disponíveis para este item.`);
      if (targetInput) targetInput.value = previousQuantity.toString(); // Reverte
      return;
    }

    const updatedAssignments = assignments
      .map((a) => (a.personId === personId ? { ...a, quantity: newQuantity } : a))
      .filter(a => a.quantity > 0); // Remove atribuições com quantidade 0

    updateProduct(productIndex, { ...productData, assignedTo: updatedAssignments });
  };


  return (
    <>
      <SubPageHeader
        title="Quem vai dividir?"
        description="Digite todos os nomes e atribua os itens"
        onBack={() => goBack()}
      />
      <div className="flex flex-col gap-3 w-full">
        {/* Seção de Adicionar Pessoas (sem alterações significativas) */}
        {people.map((personField, personIndex) => (
          <div className="flex justify-start items-center relative gap-2" key={personField._id}>
            <InputText
              placeholder="Nome da pessoa"
              className="w-full max-w-[300px]"
              {...formObject.register(`people.${personIndex}.name`)}
            />
            <input type="hidden" {...formObject.register(`people.${personIndex}.id`)} />
            <button type="button" onClick={() => removePerson(personIndex)} className="hover:opacity-80 cursor-pointer">
              <img src="/trash.svg" alt="Remover pessoa" className="size-[42px]" />
            </button>
          </div>
        ))}
        <button type="button" onClick={handleAddPerson} className="flex justify-start items-center w-full relative overflow-hidden gap-1.5 p-3 rounded-lg bg-[#f4eeec] border border-[#d1d5dc] hover:bg-[#ebe2df] transition-colors cursor-pointer">
          <img src="/add.svg" alt="Adicionar" className="size-4" />
          <p className="flex-grow-0 text-base font-medium text-center text-[#1d293d]">Adicionar Pessoa</p>
        </button>
        <div className="h-[1px] bg-[#D1D5DC] -mx-[100vw] mt-5" />

        {/* Seção de Atribuir Itens */}
        <div className="flex flex-row justify-between items-center mt-4">
          <p className="text-xl font-medium text-left text-[#1e2939]">Atribuir Itens</p>
          <TinyButton isActive={splitEvenly} className="w-auto px-4" onClick={handleSplitEvenlyToggle}>
            Dividir igualmente
          </TinyButton>
        </div>

        <div className="flex flex-col gap-6 w-full mt-3"> {/* Aumentado gap entre produtos */}
          {products.map((productField, productIndex) => {
            const productData = watchedBillItems[productIndex] as BillItemFormData;
            if (!productData) return null;

            const totalUnitsForProduct = productData.units ?? 0;
            const currentlyAssignedUnits = getAssignedQuantityForItem(productData);
            // Verifica se o item tem unidades e se elas já foram totalmente distribuídas
            const itemFullyDistributed = totalUnitsForProduct > 0 && currentlyAssignedUnits >= totalUnitsForProduct;

            return (
              <div key={productField._id} 
              className={cn("w-full p-4 border-2 border-gray-200 rounded-lg shadow bg-white",
                 itemFullyDistributed && currentlyAssignedUnits === totalUnitsForProduct && "border-green-400",
                 currentlyAssignedUnits > totalUnitsForProduct && "border-red-400"
              )}
              >
                <div className={cn("flex justify-between items-center mb-3", )}>
                  <div className="flex w-full items-center  justify-between">
                    <p className="text-sm font-semibold text-[#1e2939]">{productData.name}</p>
                    <p className="text-lg text-gray-500 font-bold">
                    R$ { (productData.price instanceof Decimal ? productData.price : new Decimal(productData.price || 0)).toFixed(2) }
                      <span className="text-sm font-normal">{totalUnitsForProduct > 0 && ` (${totalUnitsForProduct} un.)`}</span>
                    </p>
                  </div>
                  {/* {totalUnitsForProduct > 0 && !splitEvenly && (
                    <div className={`text-sm font-medium px-2 py-1 rounded ${
                        itemFullyDistributed && currentlyAssignedUnits === totalUnitsForProduct ? 'bg-green-100 text-green-700' :
                        currentlyAssignedUnits > totalUnitsForProduct ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                      }`}>
                      {currentlyAssignedUnits} / {totalUnitsForProduct} atribuídas
                    </div>
                  )} */}
                </div>

                {!splitEvenly && totalUnitsForProduct > 0 && (
                  <div className="flex flex-col gap-2">
                    {watchedPeople.map((currentPerson) => {
                      if (!currentPerson || !currentPerson.id) return null;

                      const assignment = productData.assignedTo?.find((a) => a.personId === currentPerson.id);
                      const isPersonAssigned = !!assignment;

                      // Desabilita o botão de pessoa se o item está totalmente distribuído E esta pessoa ainda não está nele.
                      const disablePersonButton = itemFullyDistributed && !isPersonAssigned;

                      return (
                        <div key={currentPerson.id} className="flex items-center gap-2 h-10 justify-between ">
                          <TinyButton
                            isActive={isPersonAssigned}
                            onClick={() => handlePersonAssignmentToggle(productIndex, productData, currentPerson.id!)}
                            disabled={disablePersonButton}
                            className="min-w-[100px] max-w-[200px] select-none" // Ajuste de largura para nomes
                          >
                            {currentPerson.name || "Pessoa sem nome"}
                          </TinyButton>
                          {isPersonAssigned && ( // Só mostra input de quantidade se a pessoa está selecionada para o item
                            <QuantityStepper
                            quantity={assignment.quantity}
                            max={totalUnitsForProduct}
                            productIndex={productIndex}
                            productData={productData}
                            personId={currentPerson.id!}
                            onChange={(productIndex, productData, personId, value) =>
                              handleQuantityChange(productIndex, productData, personId, value)
                            }
                          />
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
                {/* Caso o item não tenha unidades (ex: taxa de serviço única) */}

                {!splitEvenly && totalUnitsForProduct <= 0 && (productData.price instanceof Decimal ? productData.price : new Decimal(productData.price || 0)).greaterThan(0)  && (
                     <div className="space-y-2 mt-2">
                        {watchedPeople.map((currentPerson) => {
                            if (!currentPerson || !currentPerson.id) return null;
                             const assignment = productData.assignedTo?.find((a) => a.personId === currentPerson.id);
                             const isPersonAssigned = !!assignment;
                             // Para itens sem unidades, qualquer um pode ser selecionado/desselecionado livremente
                             return (
                                <TinyButton
                                    key={currentPerson.id}
                                    isActive={isPersonAssigned}
                                    onClick={() => handlePersonAssignmentToggle(productIndex, productData, currentPerson.id!)}
                                    className="min-w-[100px] max-w-[200px] mr-1 mb-1"
                                >
                                    {currentPerson.name || "Pessoa sem nome"}
                                </TinyButton>
                             );
                        })}
                     </div>
                )}
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
