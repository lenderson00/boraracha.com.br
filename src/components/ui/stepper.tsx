
import { Minus, Plus } from "lucide-react"
import { Button } from "./button"
import { InputText } from "@/app/app/InputText"


type StepperProps = {
  quantity: number
  max: number
  productIndex: number
  productData: any
  personId: string
  onChange: (productIndex: number, productData: any, personId: string, value: string) => void
}

export function QuantityStepper({
  quantity,
  max,
  productIndex,
  productData,
  personId,
  onChange,
}: StepperProps) {
  const handleChange = (newQty: number) => {
    if (newQty < 0 || newQty > max) return
    onChange(productIndex, productData, personId, String(newQty))
  }

  if (max === 1 ) {
    return null
  }

  return (
    <div className="flex items-center h-8 relative">
      <Button
        variant="outline"
        size="icon"
        onClick={() => handleChange(quantity - 1)}
        disabled={quantity <= 0}
        className="h-8 rounded-r-none"
      >
        <Minus className="w-4 h-4 z-20" />
      </Button>

      <InputText
        type="number"
        value={quantity || ""}
        onChange={(e) => handleChange(Number(e.target.value))}
        className="w-12 p-0 justify-center h-8 rounded-none border border-input bg-background shadow-sm select-none pointer-events-none hover:text-accent-foreground"
        min={0}
        max={max}
        placeholder="Qtd."
        disabled
      />

      <Button
        variant="outline"
        size="icon"
        onClick={() => handleChange(quantity + 1)}
        disabled={quantity >= max}
         className="h-8 rounded-l-none"
      >
        <Plus className="w-4 h-4" />
      </Button>
    </div>
  )
}