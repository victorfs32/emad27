// Tipos do formulário (usados no navegador e no servidor).

export type TriEstado = "" | "sim" | "nao"; // "" = não informado

export type TelefoneForm = { numero: string; de_quem: string; whatsapp: TriEstado };
export type CuidadorForm = { nome: string; nome_social: string; principal: boolean; vinculo: string; telefone: string; cns: string; cpf: string; rg: string; data_nascimento: string };
export type DiagnosticoForm = { cid: string; descricao: string; principal: boolean };
export type LesaoForm = { localizacao: string; classificacao: string; cobertura: string; data_avaliacao: string };

export type DadosForm = {
  prontuario: string; nome: string; nome_social: string; acs: string; uaps_id: string; uaps_nova: string;
  situacao: string; modalidade: string; situacao_data: string; situacao_motivo: string; situacao_obs: string;
  data_nascimento: string; admissao: string; cpf: string; cns: string; rg: string; nome_mae: string; nome_pai: string; sexo: string;
  cep: string; municipio: string; bairro: string; rua: string; numero: string; complemento: string; referencia: string;
  fisio: string; fisio_frequencia: string; fisio_obs: string;
  dieta_vias: string[]; dieta_outra: string; dieta_obs: string;
  diurese: string; diurese_outra: string; usa_fralda: TriEstado; continencia: string;
  tqt: TriEstado; tqt_canula_tipo: string; tqt_calibre: string; tqt_ultima_troca: string; tqt_obs: string;
  lpp: TriEstado;
  o2: TriEstado; o2_dispositivo: string; o2_fluxo: string; o2_regime: string; o2_obs: string;
  proxima_visita: string; observacoes: string; usa_cama_pmec: TriEstado; colostomia: TriEstado;
  telefones: TelefoneForm[]; cuidadores: CuidadorForm[]; diagnosticos: DiagnosticoForm[]; lesoes: LesaoForm[];
};

export const formularioVazio = (): DadosForm => ({
  prontuario: "", nome: "", nome_social: "", acs: "", uaps_id: "", uaps_nova: "", situacao: "ativo", modalidade: "", situacao_data: "",
  situacao_motivo: "", situacao_obs: "", data_nascimento: "", admissao: "", cpf: "", cns: "", rg: "", nome_mae: "", nome_pai: "", sexo: "",
  cep: "", municipio: "", bairro: "", rua: "", numero: "", complemento: "", referencia: "",
  fisio: "", fisio_frequencia: "", fisio_obs: "", dieta_vias: [], dieta_outra: "", dieta_obs: "",
  diurese: "", diurese_outra: "", usa_fralda: "", continencia: "",
  tqt: "", tqt_canula_tipo: "", tqt_calibre: "", tqt_ultima_troca: "", tqt_obs: "",
  lpp: "", o2: "", o2_dispositivo: "", o2_fluxo: "", o2_regime: "", o2_obs: "", proxima_visita: "", observacoes: "", usa_cama_pmec: "", colostomia: "",
  telefones: [], cuidadores: [], diagnosticos: [], lesoes: [],
});

export type Duplicado = { id: number; nome: string; prontuario: string; campo: "CPF" | "CNS" };
export type ResultadoSalvar = { erro?: string; duplicados?: Duplicado[] };
