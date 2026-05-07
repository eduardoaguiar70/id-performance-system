export interface Cliente {
  conta_id: string;
  conta_nome: string;
}

export interface ContaAtiva extends Cliente {
  id: string;
  ativo: boolean;
  criado_em: string;
}
