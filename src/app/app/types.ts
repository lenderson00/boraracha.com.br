type People = {
  id: string;
  name: string;
};

import Decimal from "decimal.js";

type BillItem = {
  id: string;
  name: string;
  units: number;
  unitPrice: Decimal;
  price: Decimal;
  assignedTo?: BillItemAssignment[];
};

export interface PersonFormData {
  _id?: string; // RHF key
  id: string;   // Your actual person ID
  name: string;
}

export interface BillItemAssignment {
  personId: string;
  quantity: number;
}

export type BillForm = {
  businessName?: string;
  date?: Date;
  billItems: BillItem[];
  subTotal?: Decimal;
  tax?: Decimal;
  tip?: Decimal;
  people: People[];
  splitEvenly?: boolean;
};


export interface BillItemFormData {
  _id?: string; // Chave interna do RHF
  id: string; // Seu ID único para o item
  name: string;
  units: number;
  unitPrice: Decimal;
  price: Decimal; // Este será units * unitPrice
  assignedTo?: any[]; // Se relevante de outras telas
}
