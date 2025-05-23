import { Metadata } from "next";
import ClearStorageLink from "@/components/ClearStorageLink";

export const metadata: Metadata = {
  title: "Boradivir - Divida sua conta facilmente com IA",
  description:
    "Escaneie. Toque. Divida. Tire uma foto do recibo, toque nos itens e veja quem deve o quê. Sem cadastros, sem cálculos, sem dor de cabeça.",
  openGraph: {
    images: "https://boradivir.com.br/og.png",
  },
};
export default function Home() {
  return (
    <>
      <main className="flex flex-col items-center justify-center flex-grow w-full px-4 text-center gap-4 max-w-[300px] md:max-w-[388px] ">
        <div className="flex flex-col items-center justify-center">
          <img
            src="/logo.svg"
            alt="Main Logo"
            className="w-16 h-16 sm:w-20 sm:h-20 mb-8"
          />

          <div className="mb-12">
           <h1 className="text-3xl md:text-4xl font-bold text-[#1e2939] mb-2">
              Escaneie. Selecione. Divida.
            </h1>
            <p className="text-sm sm:text-base text-[#4a5565] max-w-xs sm:max-w-sm">
              Tire uma foto do recibo, toque nos itens e veja quem deve o quê. Sem cadastros, sem contas, sem estresse.
            </p>
          </div>
        </div>

        <div className="w-full max-w-xs sm:max-w-sm flex flex-col gap-3">
          <ClearStorageLink href="/app?mode=camera">
            <img src="/camera.svg" className="w-4 h-4" />
            <p className="text-base font-semibold">Escanear Conta</p>
          </ClearStorageLink>
          <ClearStorageLink href="/app?mode=manual" variant="secondary">
            <p className="text-base font-medium text-[#364153]">
              Digitar Manualmente
            </p>
          </ClearStorageLink>
        </div>
      </main>
    </>
  );
}
