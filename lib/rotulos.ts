import {
  CONTINENCIA, DIURESE, FISIO, SITUACOES, VIAS_DIETA, formatarData, rotulo, simNao,
} from "./opcoes";
import { formatarCns, formatarCpf, formatarTelefone } from "./validacao";

const NOMES: Record<string, string> = {
  prontuario: "Prontuário", nome: "Nome", nome_social: "Nome social", acs: "ACS", uaps_id: "UAPS", situacao: "Situação", modalidade: "Modalidade",
  situacao_data: "Data da situação", obito_do_programa: "DO fornecida pelo Programa", obito_do_justificativa: "Justificativa (DO não fornecida)", situacao_motivo: "Motivo da situação", situacao_obs: "Observações da situação",
  data_nascimento: "Data de nascimento", admissao: "Admissão", cpf: "CPF", cns: "CNS", rg: "RG", nome_mae: "Nome da mãe", nome_pai: "Nome do pai", sexo: "Sexo",
  cep: "CEP", municipio: "Município", bairro: "Bairro", rua: "Rua", numero: "Número", complemento: "Complemento",
  referencia: "Ponto de referência", fisio: "Fisioterapia", fisio_frequencia: "Frequência da fisioterapia",
  fisio_obs: "Obs. da fisioterapia", dieta_vias: "Via de alimentação", dieta_outra: "Outra via de alimentação",
  dieta_obs: "Obs. da dieta", diurese: "Diurese", diurese_outra: "Outra forma de diurese", usa_fralda: "Uso de fralda",
  continencia: "Continência", tqt: "Traqueostomia", tqt_canula_tipo: "Tipo de cânula", tqt_calibre: "Calibre da cânula",
  tqt_ultima_troca: "Última troca da cânula", tqt_obs: "Obs. da traqueostomia", lpp: "Lesão por pressão", o2: "Oxigênio",
  o2_dispositivo: "Dispositivo de O₂", o2_fluxo: "Fluxo de O₂ (L/min)", o2_regime: "Regime de O₂", o2_obs: "Obs. do O₂",
  proxima_visita: "Próxima visita", observacoes: "Observações", usa_cama_pmec: "Usa cama do PMEC", usa_aspirador_pmec: "Usa aspirador do PMEC", colostomia: "Colostomia",
};

export const nomeDoCampo = (c: string) => NOMES[c] ?? c;

/** Texto legível para o valor de um campo registrado no histórico. */
export function valorLegivel(campo: string, v: unknown, uapss: Map<number, string>): string {
  if (v === null || v === undefined || v === "") return "Não informado";
  if (typeof v === "boolean") return simNao(v);
  if (Array.isArray(v)) return v.length ? v.map((x) => rotulo(VIAS_DIETA, String(x)) ?? String(x)).join(", ") : "Nenhuma";
  const s = String(v);
  switch (campo) {
    case "situacao": return rotulo(SITUACOES, s) ?? s;
    case "sexo": return s === "F" ? "Feminino" : s === "M" ? "Masculino" : s;
    case "fisio": return rotulo(FISIO, s) ?? s;
    case "diurese": return rotulo(DIURESE, s) ?? s;
    case "continencia": return rotulo(CONTINENCIA, s) ?? s;
    case "uaps_id": return uapss.get(Number(s)) ?? `UAPS ${s}`;
    case "cpf": return formatarCpf(s);
    case "cns": return formatarCns(s);
    case "data_nascimento": case "admissao": case "situacao_data": case "proxima_visita": case "tqt_ultima_troca":
      return formatarData(s);
    default: return s;
  }
}

export const formatarTel = formatarTelefone;
