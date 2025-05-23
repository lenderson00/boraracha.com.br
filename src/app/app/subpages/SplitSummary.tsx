import SubPageHeader from "@/components/SubPageHeader";
import { Button } from "@/components/ui/button";
import { UseFormReturn, useFieldArray, useWatch } from "react-hook-form";
import { BillForm, BillItemFormData, PersonFormData } from "../types"; // Certifique-se que os tipos estão corretos
import Link from "next/link";
import { useEffect, useMemo, useState, useCallback }
from "react";
import { getTotal } from "../utils";
import Decimal from "decimal.js";
import Confetti from "react-confetti-boom";

export const SplitSummary = ({
  goBack,
  formObject,
}: {
  goBack: () => void;
  formObject: UseFormReturn<BillForm>;
}) => {
  const { control, watch } = formObject;

  const { fields: peopleFields } = useFieldArray({
    control: control,
    name: "people",
    keyName: "_id",
  });

  // Observar campos específicos para otimizar re-renderizações do useMemo
  const people = watch("people") || [];
  const billItems = watch("billItems") || [];
  const taxData = watch("tax");
  const tipData = watch("tip");
  const isEvenly = watch("splitEvenly");

  // O total geral já inclui itens, gorjeta e taxa.
  // A função getTotal deve estar correta, somando billItems[n].price + tax + tip.
  const grandTotal = useMemo(() => getTotal(watch()), [watch]);


  const amountsForPeople = useMemo(() => {
    const currentPeople: PersonFormData[] = people || [];
    const currentBillItems: BillItemFormData[] = billItems || [];
    const currentTax = taxData instanceof Decimal ? taxData : new Decimal(taxData || 0);
    const currentTip = tipData instanceof Decimal ? tipData : new Decimal(tipData || 0);

    if (currentPeople.length === 0) {
      return [];
    }

    // Se apenas uma pessoa, ela paga o total geral.
    if (currentPeople.length === 1) {
      return [grandTotal];
    }

    if (isEvenly) {
      const amountPerPerson = grandTotal.dividedBy(currentPeople.length).toDecimalPlaces(2, Decimal.ROUND_DOWN);
      let remainder = grandTotal.minus(amountPerPerson.times(currentPeople.length));
      
      return currentPeople.map((_, index) => {
        let share = amountPerPerson;
        if (index === 0) {
          share = share.plus(remainder);
        }
        return share;
      });
    }

    // Cálculo NÃO IGUALITÁRIO (!isEvenly)
    const personTotals = new Array(currentPeople.length).fill(null).map(() => new Decimal(0));

    // 1. Calcular a parte de cada pessoa nos itens
    currentBillItems.forEach((item) => {
      const assignments = item.assignedTo || []; // Array de { personId: string, quantity: number }
      
      if (assignments.length > 0) {
        if (item.units > 0) { // Item com unidades, dividir por quantidade consumida
          const totalQuantityConsumedOfThisItem = assignments.reduce((sum, ash) => sum + (ash.quantity || 0), 0);
          if (totalQuantityConsumedOfThisItem > 0) {
            // item.price é o preço total para item.units.
            // O custo por unidade "efetivo" deste item é item.price / totalQuantityConsumedOfThisItem (se as unidades originais não importam mais)
            // Ou, mais corretamente, se item.unitPrice está disponível e item.price = item.unitPrice * item.units
            // Custo para a pessoa = assignment.quantity * item.unitPrice
            // Vamos assumir que item.price é o valor total do item e distribuí-lo proporcionalmente às quantidades consumidas.
            
            assignments.forEach((assignment) => {
              const personIndex = currentPeople.findIndex((p) => p.id === assignment.personId);
              if (personIndex !== -1 && assignment.quantity > 0) {
                const costForThisPersonThisItem = new Decimal(assignment.quantity)
                  .dividedBy(totalQuantityConsumedOfThisItem)
                  .times(item.price); // item.price é o preço total do item
                personTotals[personIndex] = personTotals[personIndex].plus(costForThisPersonThisItem);
              }
            });
          }
        } else if (item.price.greaterThan(0)) { // Item sem unidades, mas com preço (ex: taxa de serviço no item)
          // Dividir igualmente entre as pessoas atribuídas a este item específico
          const pricePerAssignedPerson = item.price.dividedBy(assignments.length); // Não precisa de .toDecimalPlaces ainda
          assignments.forEach((assignment) => {
            const personIndex = currentPeople.findIndex((p) => p.id === assignment.personId);
            if (personIndex !== -1) {
              personTotals[personIndex] = personTotals[personIndex].plus(pricePerAssignedPerson);
            }
          });
        }
      }
    });
    
    // Arredondar os totais dos itens e distribuir o resto global dos itens
    // Primeiro, somar todos os valores exatos dos itens calculados para as pessoas
    let sumOfExactItemPortions = personTotals.reduce((sum, pt) => sum.plus(pt), new Decimal(0));
    // Calcular o total real de todos os itens da conta
    const totalBillItemPrices = currentBillItems.reduce((sum, bi) => sum.plus(bi.price || new Decimal(0)), new Decimal(0));
    // A diferença é o "resto" global dos itens devido a cálculos fracionários internos
    let globalItemRemainder = totalBillItemPrices.minus(sumOfExactItemPortions);

    const itemTotalsRounded = personTotals.map((total, index) => {
        let finalItemPortion = total;
        if (index === 0) {
            finalItemPortion = finalItemPortion.plus(globalItemRemainder);
        }
        return finalItemPortion.toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
    });
    
    // Recalcular a soma após o arredondamento dos itens para garantir que bate com o total dos itens
    const sumOfRoundedItemPortions = itemTotalsRounded.reduce((sum, r) => sum.plus(r), new Decimal(0));
    const finalItemRoundingDifference = totalBillItemPrices.minus(sumOfRoundedItemPortions);
    if (itemTotalsRounded.length > 0) {
        itemTotalsRounded[0] = itemTotalsRounded[0].plus(finalItemRoundingDifference);
    }


    // 2. Dividir taxas e gorjeta igualmente
    const extraCharges = currentTax.plus(currentTip);
    if (extraCharges.greaterThan(0)) {
      const extraChargesPerPerson = extraCharges.dividedBy(currentPeople.length).toDecimalPlaces(2, Decimal.ROUND_DOWN);
      let extraChargesRemainder = extraCharges.minus(extraChargesPerPerson.times(currentPeople.length));

      return itemTotalsRounded.map((itemAmount, index) => {
        let finalAmount = itemAmount.plus(extraChargesPerPerson);
        if (index === 0) {
          finalAmount = finalAmount.plus(extraChargesRemainder);
        }
        return finalAmount;
      });
    }
    
    return itemTotalsRounded; // Retorna apenas os totais dos itens se não houver taxas/gorjetas

  }, [people, billItems, taxData, tipData, isEvenly, grandTotal]);

  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    const hasShownConfetti = sessionStorage.getItem("hasShownConfetti_v2"); // Mudei a chave para resetar em nova versão
    if (!hasShownConfetti) {
      setShowConfetti(true);
      sessionStorage.setItem("hasShownConfetti_v2", "true");
    }
  }, []);

  const handleCopyToClipboard = useCallback(() => {
    const textToCopy = `Resumo da divisão da conta:
${(people || []).map((person, index) => {
  const amount = amountsForPeople[index] instanceof Decimal 
                  ? amountsForPeople[index].toFixed(2) 
                  : "0.00";
  return `- ${person.name}: R$ ${amount}`;
}).join("\n")}

Total da Conta: R$ ${grandTotal.toFixed(2)}`;

    navigator.clipboard.writeText(textToCopy).then(() => {
      alert("Resumo copiado para a área de transferência!"); // TODO: Usar um toast
    }).catch(err => {
      console.error("Erro ao copiar para o clipboard: ", err);
      alert("Erro ao copiar. Verifique o console.");
    });
  }, [people, amountsForPeople, grandTotal]);

  return (
    <>
      {showConfetti && (
        <Confetti
          mode="boom" x={0.5} y={0.5} particleCount={300} deg={270}
          shapeSize={8} spreadDeg={180} effectInterval={3000} effectCount={1}
          colors={["#6a2000", "#d04f17", "#f4eeec"]} launchSpeed={1.5}
        />
      )}
      <SubPageHeader
        title="Conta Dividida!"
        description="Veja quem paga o quê:"
        onBack={() => goBack()}
      />
      <div className="flex flex-col gap-3 w-full">
        {peopleFields.map((field, index) => (
          <div
            className="h-auto min-h-[47px] relative rounded-lg bg-white border border-gray-200 w-full flex flex-row justify-between items-center p-4"
            key={field._id}
          >
            <p className="text-base font-medium text-left text-[#1e2939] break-all pr-2">
              {field.name}
            </p>
            <p className="font-medium text-right whitespace-nowrap">
              <span className="text-base font-medium text-right text-[#6a7282]">
                R$
              </span>
              <span className="text-base font-medium text-right text-[#1e2939]">
                {" "}
              </span>
              <span className="text-xl font-medium text-right text-[#1e2939]">
                {amountsForPeople.length > index && amountsForPeople[index] instanceof Decimal
                  ? amountsForPeople[index].toFixed(2)
                  : "0.00"}
              </span>
            </p>
          </div>
        ))}
      </div>
      <Button
        className="w-full mt-6"
        onClick={handleCopyToClipboard}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" className="mr-2">
          <path d="M10.5 11.5V13.75C10.5 14.164 10.164 14.5 9.75 14.5H3.25C3.05109 14.5 2.86032 14.421 2.71967 14.2803C2.57902 14.1397 2.5 13.9489 2.5 13.75V5.25C2.5 4.836 2.836 4.5 3.25 4.5H4.5M10.5 11.5H12.75C13.164 11.5 13.5 11.164 13.5 10.75V7.5C13.5 4.52667 11.338 2.05933 8.5 1.58267M10.5 11.5H6.25C6.05109 11.5 5.86032 11.421 5.71967 11.2803C5.57902 11.1397 5.5 10.9489 5.5 10.75V4.58266M5.5 4.58266C5.16954 4.52742 4.83505 4.49977 4.5 4.5M5.5 4.58266V2.25C5.5 1.836 5.836 1.5 6.25 1.5H7.5C7.83505 1.49977 8.16954 1.52742 8.5 1.58267M13.5 7.5V9M8.5 1.58267C9.02475 1.68455 9.51596 1.87753 9.95217 2.15071C10.3884 2.42389 10.7616 2.77164 11.0521 3.1766C11.3426 3.58157 11.5447 4.03607 11.649 4.51503C11.7532 4.99398 11.7576 5.4893 11.6621 5.97432" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <span>Compartilhar Resumo</span>
      </Button>
      <Link href="/" className="w-full">
        <Button className="w-full mt-3" variant="secondary">
          <svg width="17" height="16" viewBox="0 0 17 16" fill="none" xmlns="http://www.w3.org/2000/svg" className="mr-2">
            <path d="M2 7.99999L7.96933 2.02999C8.26267 1.73732 8.73733 1.73732 9.03 2.02999L15 7.99999M3.5 6.49999V13.25C3.5 13.664 3.836 14 4.25 14H7V10.75C7 10.336 7.336 9.99999 7.75 9.99999H9.25C9.664 9.99999 10 10.336 10 10.75V14H12.75C13.164 14 13.5 13.664 13.5 13.25V6.49999" stroke="#4A5565" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span>Voltar para Início</span>
        </Button>
      </Link>
    </>
  );
};