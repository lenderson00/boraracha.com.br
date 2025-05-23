import SubPageHeader from "@/components/SubPageHeader";
import { Button } from "@/components/ui/button";
import { UseFormReturn, useFieldArray } from "react-hook-form";
import { BillForm } from "../types";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
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
  const { fields } = useFieldArray({
    control: formObject.control,
    name: "people",
    keyName: "_id",
  });

  const isEvenly = useMemo(() => {
    return formObject.watch().splitEvenly;
  }, [formObject.watch()]);

  const total = getTotal(formObject.watch());

  const amountsForPeople = useMemo(() => {
    const people = formObject.watch().people || [];

    const amountOfPeople = people.length;
    // if we have 1 person, we want to give the total to them
    if (amountOfPeople === 1) {
      return [total];
    }

    if (isEvenly) {
      // if we have 2 people and we need to divide 15.15$ we want to give 7.57 to each person but
      // the remainder is 0.01 so we want to give 7.58 to the first person
      const amountForEachPerson = total
        .dividedBy(amountOfPeople)
        .toDecimalPlaces(2);
      const remainder = total.minus(amountForEachPerson.times(amountOfPeople));

      return people.map((_, index) => {
        // Add any remainder to the first person's amount
        return index === 0
          ? amountForEachPerson.plus(remainder)
          : amountForEachPerson;
      });
    }

    // Calculate each person's share of items they're assigned to
    const itemTotals = new Array(people.length).fill(new Decimal(0));
    const billItems = formObject.watch().billItems || [];

    billItems.forEach((item) => {
      const assignedPeople = item.assignedTo || [];
      if (assignedPeople.length > 0) {
        // Split item price equally among assigned people
        const pricePerPerson = item.price
          .dividedBy(assignedPeople.length)
          .toDecimalPlaces(2);
        const remainder = item.price.minus(
          pricePerPerson.times(assignedPeople.length)
        );

        assignedPeople.forEach((personId, index) => {
          const personIndex = people.findIndex((p) => p.id === personId);
          if (personIndex !== -1) {
            // Add remainder to first person's share
            itemTotals[personIndex] = itemTotals[personIndex].plus(
              index === 0 ? pricePerPerson.plus(remainder) : pricePerPerson
            );
          }
        });
      }
    });

    // Split tax and tip evenly
    const tax = formObject.watch().tax || new Decimal(0);
    const tip = formObject.watch().tip || new Decimal(0);
    const extraCharges = tax.plus(tip);
    const extraChargesPerPerson = extraCharges
      .dividedBy(people.length)
      .toDecimalPlaces(2);
    const extraChargesRemainder = extraCharges.minus(
      extraChargesPerPerson.times(people.length)
    );

    // Return final amounts with tax and tip included
    return itemTotals.map((amount, index) => {
      return amount.plus(
        index === 0
          ? extraChargesPerPerson.plus(extraChargesRemainder)
          : extraChargesPerPerson
      );
    });
  }, [formObject.watch()]);

  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    // Check if confetti has been shown in this session
    const hasShownConfetti = sessionStorage.getItem("hasShownConfetti");
    if (!hasShownConfetti) {
      setShowConfetti(true);
      sessionStorage.setItem("hasShownConfetti", "true");
    }
  }, []);

  return (
    <>
      {showConfetti && (
        <Confetti
          mode="boom"
          x={0.5}
          y={0.5}
          particleCount={600}
          deg={270}
          shapeSize={8}
          spreadDeg={180}
          effectInterval={3000}
          effectCount={1}
          colors={["#6a2000", "#d04f17", "#f4eeec"]}
          launchSpeed={1.5}
        />
      )}
      <SubPageHeader
        title="Conta Dividida!"
        description="Veja quem paga o quê:"
        onBack={() => goBack()}
      />
      <div className="flex flex-col gap-3 w-full">
        {fields.map((field, index) => (
          <div
            className="h-[47px] relative rounded-lg bg-white border border-gray-200 w-full flex flex-row justify-between items-center p-4"
            key={field._id}
          >
            <p className="text-base font-medium text-left text-[#1e2939]">
              {field.name}
            </p>
            <p className="font-medium text-right">
              <span className="text-base font-medium text-right text-[#6a7282]">
                R$
              </span>
              <span className="text-base font-medium text-right text-[#1e2939]">
                {" "}
              </span>
              <span className="text-xl font-medium text-right text-[#1e2939]">
                {amountsForPeople.length > index
                  ? amountsForPeople[index].toString()
                  : "-"}
              </span>
            </p>
          </div>
        ))}
      </div>
      <Button
        className="w-full mt-6"
        onClick={() => {
          // copy to clipboard a formatted string with the people and their amounts
          const people = formObject.watch().people || [];
          const amounts = amountsForPeople;
          const formattedString = `
Here's how we should split this bill:
${people
  .map((person, index) => {
    return `- ${person.name}: $${amounts[index].toString()}`;
  })
  .join("\n")}
  
Total: ${total}`;

          navigator.clipboard.writeText(formattedString);

          // TODO replace with toast and if on mobile maybe use native share functionality of the browser
          alert("Copied to clipboard!");
        }}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M10.5 11.5V13.75C10.5 14.164 10.164 14.5 9.75 14.5H3.25C3.05109 14.5 2.86032 14.421 2.71967 14.2803C2.57902 14.1397 2.5 13.9489 2.5 13.75V5.25C2.5 4.836 2.836 4.5 3.25 4.5H4.5C4.83505 4.49977 5.16954 4.52742 5.5 4.58267M10.5 11.5H12.75C13.164 11.5 13.5 11.164 13.5 10.75V7.5C13.5 4.52667 11.338 2.05933 8.5 1.58267C8.16954 1.52742 7.83505 1.49977 7.5 1.5H6.25C5.836 1.5 5.5 1.836 5.5 2.25V4.58267M10.5 11.5H6.25C6.05109 11.5 5.86032 11.421 5.71967 11.2803C5.57902 11.1397 5.5 10.9489 5.5 10.75V4.58267M13.5 9V7.75C13.5 7.15326 13.2629 6.58097 12.841 6.15901C12.419 5.73705 11.8467 5.5 11.25 5.5H10.25C10.0511 5.5 9.86032 5.42098 9.71967 5.28033C9.57902 5.13968 9.5 4.94891 9.5 4.75V3.75C9.5 3.45453 9.4418 3.16195 9.32873 2.88896C9.21566 2.61598 9.04992 2.36794 8.84099 2.15901C8.63206 1.95008 8.38402 1.78435 8.11104 1.67127C7.83806 1.5582 7.54547 1.5 7.25 1.5H6.5"
            stroke="white"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>

        <span>Compartilhar</span>
      </Button>
      <Link href="/" className="w-full">
        <Button className="w-full" variant="secondary">
          <svg
            width="17"
            height="16"
            viewBox="0 0 17 16"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M2 7.99999L7.96933 2.02999C8.26267 1.73732 8.73733 1.73732 9.03 2.02999L15 7.99999M3.5 6.49999V13.25C3.5 13.664 3.836 14 4.25 14H7V10.75C7 10.336 7.336 9.99999 7.75 9.99999H9.25C9.664 9.99999 10 10.336 10 10.75V14H12.75C13.164 14 13.5 13.664 13.5 13.25V6.49999M6 14H11.5"
              stroke="#4A5565"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>

          <span>Voltar para Início</span>
        </Button>
      </Link>
    </>
  );
};
