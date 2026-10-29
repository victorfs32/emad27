-- Versão 15: acrescenta o tipo de documento "capa do prontuário domiciliar". Pode rodar mais de uma vez.

create or replace function public.registrar_documento(p_id bigint, p_tipo text) returns void
language plpgsql security definer set search_path = public as $$
declare v_resumo text;
begin
  if not public.perm('exportar') then raise exception 'Sem permissão.' using errcode = '42501'; end if;
  v_resumo := case p_tipo
    when 'relatorio' then 'Relatório em PDF gerado'
    when 'prescricao' then 'Formulário de prescrição médica gerado'
    when 'prescricao_impressa' then 'Prescrição impressa'
    when 'doc_receituario_medico' then 'Receituário médico gerado'
    when 'doc_receituario_controle_especial' then 'Receituário de controle especial gerado'
    when 'doc_dieta_enteral' then 'Requerimento de dieta enteral gerado'
    when 'doc_antimicrobiano' then 'Ficha de antimicrobiano gerada'
    when 'doc_fraldas' then 'Requerimento de fraldas descartáveis gerado'
    when 'doc_exames' then 'Solicitação de exames gerada'
    when 'doc_elegibilidade_admissao' then 'Avaliação de elegibilidade e admissão gerada'
    when 'doc_medicamentos_especiais' then 'Solicitação de medicamentos especiais gerada'
    when 'doc_iaec_d' then 'Instrumento IAEC-D gerado'
    when 'doc_atestado' then 'Atestado médico gerado'
    when 'doc_capa' then 'Capa do prontuário domiciliar gerada'
    else null end;
  if v_resumo is null then raise exception 'Tipo de documento inválido.'; end if;
  insert into public.historico (paciente_id, usuario_id, autor, tipo, resumo)
  values (p_id, auth.uid(), public.nome_do_usuario(), 'documento', v_resumo);
end $$;

revoke execute on function public.registrar_documento(bigint, text) from public;
grant execute on function public.registrar_documento(bigint, text) to authenticated;

notify pgrst, 'reload schema';
