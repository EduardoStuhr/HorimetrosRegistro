import { z } from 'zod';
import { FROTAS_SEED_MAP } from './frotas-seed';

export const RegistroDispositivoSchema = z.object({
  chaveInstalacao: z.string().min(1, 'Chave de instalação obrigatória'),
  apelido: z.string().optional().default('Aparelho Campo')
});

export const LeituraInputSchema = z.object({
  id: z.string().uuid('ID deve ser um UUID v4 gerado no cliente'),
  frotaNumero: z.number().int().refine((num) => FROTAS_SEED_MAP.has(num), {
    message: 'Número de frota não cadastrado na TRANSJAP'
  }),
  valorConfirmado: z.number().nonnegative('O valor do horímetro deve ser positivo'),
  valorOcr: z.number().nonnegative('O valor lido pelo OCR deve ser positivo'),
  capturadoEm: z.string().datetime({ message: 'Data de captura deve estar no formato ISO 8601' }),
  dispositivoId: z.string().min(1, 'Dispositivo obrigatório'),
  lat: z.number().nullable().optional().default(null),
  lng: z.number().nullable().optional().default(null)
});

export const FotoUploadConfirmSchema = z.object({
  leituraId: z.string().uuid(),
  chaveBucket: z.string(),
  hashSha256: z.string(),
  bytes: z.number().int().positive()
});

export const AdminAjusteLeituraSchema = z.object({
  novoValor: z.number().positive('Novo valor deve ser positivo'),
  motivo: z.string().min(5, 'Informe o motivo do ajuste para fins de auditoria'),
  marcarRevisada: z.boolean().default(true)
});

export const AdminLoginSchema = z.object({
  email: z.string().email('E-mail inválido'),
  senha: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres')
});
