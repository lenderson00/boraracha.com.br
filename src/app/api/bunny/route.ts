import { NextRequest } from "next/server";
import sharp from "sharp";

const API_KEY = process.env.BUNNY_KEY!;
const STORAGE_ZONE = "framer";
const CDN_BASE_URL = "https://framer.b-cdn.net";
const STORAGE_BASE_URL = `https://storage.bunnycdn.com/${STORAGE_ZONE}/split`;

export async function POST(req: NextRequest) {
	const formData = await req.formData();
	const file = formData.get("file") as File | null;

	if (!file) {
		return new Response("Arquivo não encontrado", { status: 400 });
	}

	try {
		const arrayBuffer = await file.arrayBuffer();
		const buffer = Buffer.from(arrayBuffer);

		// Usa sharp para redimensionar e converter/comprimir a imagem
		const compressedImage = await sharp(buffer)
			.resize({ width: 1080, withoutEnlargement: true }) // Reduz largura para até 1080px
			.toFormat("webp", { quality: 75 }) // Salva como webp com compressão
			.toBuffer();

		const fileName = `${crypto.randomUUID()}.webp`;
		const uploadUrl = `${STORAGE_BASE_URL}/${fileName}`;

		const uploadResponse = await fetch(uploadUrl, {
			method: "PUT",
			headers: {
				AccessKey: API_KEY,
				"Content-Type": "application/octet-stream",
			},
			body: compressedImage,
		});

		if (!uploadResponse.ok) {
			console.error(await uploadResponse.text());
			return new Response("Erro ao fazer upload no BunnyCDN", { status: 500 });
		}

		return new Response(JSON.stringify({
			message: "Upload com sucesso!",
			url: `${CDN_BASE_URL}/split/${fileName}`,
		}), {
			status: 200,
			headers: {
				"Content-Type": "application/json",
			},
		});

	} catch (error: any) {
		console.error("Erro ao processar imagem:", error);
		return new Response("Erro interno no processamento", { status: 500 });
	}
}
