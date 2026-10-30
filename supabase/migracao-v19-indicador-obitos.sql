-- EMAD 27 — versão 19: indicador de óbitos. Guarda se a declaração de óbito (DO) foi fornecida pelo Programa
-- e, se não foi, a justificativa. Execute no Supabase: SQL Editor > New query > colar > Run.
-- Pode ser repetido; não apaga dados. (O mesmo bloco também está em schema.sql.)

alter table public.pacientes add column if not exists obito_do_programa boolean;
alter table public.pacientes add column if not exists obito_do_justificativa text;

create or replace function public.salvar_paciente(p_id bigint, p jsonb) returns bigint
language plpgsql security definer set search_path = public as $$
declare
  v_id bigint := p_id;
  cols text := 'prontuario, nome, uaps_id, situacao, modalidade, situacao_data, situacao_motivo, situacao_obs, '
    'data_nascimento, admissao, cpf, cns, rg, nome_mae, nome_pai, cep, municipio, bairro, rua, numero, complemento, referencia, '
    'fisio, fisio_frequencia, fisio_obs, dieta_vias, dieta_outra, dieta_obs, diurese, diurese_outra, usa_fralda, continencia, '
    'tqt, tqt_canula_tipo, tqt_calibre, tqt_ultima_troca, tqt_obs, lpp, o2, o2_dispositivo, o2_fluxo, o2_regime, o2_obs, '
    'proxima_visita, observacoes, usa_cama_pmec, colostomia, sexo, nome_social, acs, usa_aspirador_pmec, '
    'obito_do_programa, obito_do_justificativa';
  ant jsonb; dep jsonb; t record; linhas int;
begin
  if p_id is null then
    if not public.perm('cadastrar') then raise exception 'Sem permissão para cadastrar.' using errcode = '42501'; end if;
    execute format('insert into public.pacientes (%s) select %s from jsonb_populate_record(null::public.pacientes, $1) returning id', cols, cols)
      into v_id using p -> 'paciente';
  else
    if not public.perm('editar') then raise exception 'Sem permissão para editar.' using errcode = '42501'; end if;
    execute format('update public.pacientes set (%s) = (select %s from jsonb_populate_record(null::public.pacientes, $1)) where id = $2', cols, cols)
      using p -> 'paciente', p_id;
    get diagnostics linhas = row_count;
    if linhas = 0 then raise exception 'Paciente não encontrado.'; end if;
  end if;

  -- Substitui as listas e registra no histórico apenas o que realmente mudou.
  for t in select * from (values
      ('telefones', 'Telefones'), ('cuidadores', 'Cuidadores'),
      ('diagnosticos', 'Diagnósticos (CID)'), ('lesoes_pressao', 'Lesões por pressão')) as x(tabela, rotulo)
  loop
    execute format('select coalesce(jsonb_agg(to_jsonb(r) - ''id'' - ''paciente_id'' order by r.id), ''[]''::jsonb) from public.%I r where paciente_id = $1', t.tabela)
      into ant using v_id;
    execute format('delete from public.%I where paciente_id = $1', t.tabela) using v_id;
    if t.tabela = 'telefones' then
      insert into public.telefones (paciente_id, numero, de_quem, whatsapp)
      select v_id, x.numero, x.de_quem, x.whatsapp
        from jsonb_populate_recordset(null::public.telefones, coalesce(p -> 'telefones', '[]'::jsonb)) x;
    elsif t.tabela = 'cuidadores' then
      insert into public.cuidadores (paciente_id, nome, principal, vinculo, telefone, cns, cpf, nome_social, rg, data_nascimento)
      select v_id, x.nome, coalesce(x.principal, false), x.vinculo, x.telefone, x.cns, x.cpf, x.nome_social, x.rg, x.data_nascimento
        from jsonb_populate_recordset(null::public.cuidadores, coalesce(p -> 'cuidadores', '[]'::jsonb)) x;
    elsif t.tabela = 'diagnosticos' then
      insert into public.diagnosticos (paciente_id, cid, descricao, principal)
      select v_id, x.cid, x.descricao, coalesce(x.principal, false)
        from jsonb_populate_recordset(null::public.diagnosticos, coalesce(p -> 'diagnosticos', '[]'::jsonb)) x;
    else
      insert into public.lesoes_pressao (paciente_id, localizacao, classificacao, cobertura, data_avaliacao)
      select v_id, x.localizacao, x.classificacao, x.cobertura, x.data_avaliacao
        from jsonb_populate_recordset(null::public.lesoes_pressao, coalesce(p -> 'lesoes_pressao', '[]'::jsonb)) x;
    end if;
    execute format('select coalesce(jsonb_agg(to_jsonb(r) - ''id'' - ''paciente_id'' order by r.id), ''[]''::jsonb) from public.%I r where paciente_id = $1', t.tabela)
      into dep using v_id;
    if ant is distinct from dep then
      insert into public.historico (paciente_id, usuario_id, autor, tipo, resumo, detalhes)
      values (v_id, auth.uid(), public.nome_do_usuario(), 'lista', t.rotulo || ' atualizados',
              jsonb_build_object('lista', t.tabela, 'de', ant, 'para', dep));
    end if;
  end loop;
  return v_id;
end $$;

create or replace function public.definir_obito_do(p_id bigint, p_fornecida boolean, p_justificativa text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.perm('editar') then raise exception 'Sem permissão para editar.' using errcode = '42501'; end if;
  if length(coalesce(p_justificativa, '')) > 500 then raise exception 'Justificativa longa demais.'; end if;
  update public.pacientes
     set obito_do_programa = p_fornecida,
         obito_do_justificativa = case when p_fornecida is distinct from false then null else nullif(trim(p_justificativa), '') end
   where id = p_id and situacao = 'obito';
  if not found then raise exception 'Paciente não encontrado ou não está com situação óbito.'; end if;
end $$;

revoke execute on function public.definir_obito_do(bigint, boolean, text) from public, anon;
grant execute on function public.definir_obito_do(bigint, boolean, text) to authenticated;

notify pgrst, 'reload schema';
