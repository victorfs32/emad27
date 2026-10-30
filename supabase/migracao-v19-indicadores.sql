-- EMAD 27 — versão 19: indicadores mensais (óbitos, acompanhamento AD1, reinternação, busca ativa e altas).
-- Execute no Supabase: SQL Editor > New query > colar > Run. Pode ser repetido; não apaga dados.
-- (O mesmo bloco também está em schema.sql.)

alter table public.pacientes add column if not exists obito_do_programa boolean;
alter table public.pacientes add column if not exists obito_do_justificativa text;
alter table public.pacientes add column if not exists motivo_permanencia text;
alter table public.pacientes add column if not exists alta_tipo text check (alta_tipo in ('administrativa','atencao_basica','internacao','urgencia'));

create or replace function public.salvar_paciente(p_id bigint, p jsonb) returns bigint
language plpgsql security definer set search_path = public as $$
declare
  v_id bigint := p_id;
  cols text := 'prontuario, nome, uaps_id, situacao, modalidade, situacao_data, situacao_motivo, situacao_obs, '
    'data_nascimento, admissao, cpf, cns, rg, nome_mae, nome_pai, cep, municipio, bairro, rua, numero, complemento, referencia, '
    'fisio, fisio_frequencia, fisio_obs, dieta_vias, dieta_outra, dieta_obs, diurese, diurese_outra, usa_fralda, continencia, '
    'tqt, tqt_canula_tipo, tqt_calibre, tqt_ultima_troca, tqt_obs, lpp, o2, o2_dispositivo, o2_fluxo, o2_regime, o2_obs, '
    'proxima_visita, observacoes, usa_cama_pmec, colostomia, sexo, nome_social, acs, usa_aspirador_pmec, '
    'obito_do_programa, obito_do_justificativa, motivo_permanencia, alta_tipo';
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

-- Motivo da permanência do paciente no programa (indicador de acompanhamento AD1).
create or replace function public.definir_motivo_permanencia(p_id bigint, p_texto text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.perm('editar') then raise exception 'Sem permissão para editar.' using errcode = '42501'; end if;
  if length(coalesce(p_texto, '')) > 300 then raise exception 'Texto longo demais.'; end if;
  update public.pacientes set motivo_permanencia = nullif(trim(p_texto), '') where id = p_id;
  if not found then raise exception 'Paciente não encontrado.'; end if;
end $$;

-- Tipo de alta (indicador de altas); óbito já é um tipo por si.
create or replace function public.definir_alta_tipo(p_id bigint, p_tipo text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.perm('editar') then raise exception 'Sem permissão para editar.' using errcode = '42501'; end if;
  if p_tipo is not null and p_tipo not in ('administrativa','atencao_basica','internacao','urgencia') then
    raise exception 'Tipo de alta inválido.';
  end if;
  update public.pacientes set alta_tipo = p_tipo where id = p_id and situacao in ('alta','transferido');
  if not found then raise exception 'Paciente não encontrado ou não está com alta/transferência.'; end if;
end $$;

-- Reinternações: paciente que voltou ao hospital (conta no indicador se for até 30 dias após a admissão).
create table if not exists public.reinternacoes (
  id bigint generated always as identity primary key,
  paciente_id bigint not null references public.pacientes(id) on delete cascade,
  data date not null,
  motivo text,
  usuario_id uuid default auth.uid(),
  autor text not null default 'Sistema',
  criado_em timestamptz not null default now()
);
create index if not exists ix_reint_data on public.reinternacoes (data);
create index if not exists ix_reint_pac on public.reinternacoes (paciente_id);
alter table public.reinternacoes enable row level security;
drop policy if exists ver_reinternacoes on public.reinternacoes;
create policy ver_reinternacoes on public.reinternacoes for select to authenticated using (public.perm('ver'));
revoke all on public.reinternacoes from anon;

create or replace function public.salvar_reinternacao(p_paciente bigint, p_data date, p_motivo text) returns bigint
language plpgsql security definer set search_path = public as $$
declare v_id bigint;
begin
  if not public.perm('editar') then raise exception 'Sem permissão para editar.' using errcode = '42501'; end if;
  if p_data is null or p_data > current_date then raise exception 'Data de reinternação inválida.'; end if;
  if length(coalesce(p_motivo, '')) > 300 then raise exception 'Motivo longo demais.'; end if;
  if not exists (select 1 from public.pacientes where id = p_paciente) then raise exception 'Paciente não encontrado.'; end if;
  insert into public.reinternacoes (paciente_id, data, motivo, autor)
  values (p_paciente, p_data, nullif(trim(p_motivo), ''), public.nome_do_usuario())
  returning id into v_id;
  insert into public.historico (paciente_id, usuario_id, autor, tipo, resumo, detalhes)
  values (p_paciente, auth.uid(), public.nome_do_usuario(), 'reinternacao', 'Reinternação registrada',
          jsonb_build_object('data', p_data, 'motivo', nullif(trim(p_motivo), '')));
  return v_id;
end $$;

create or replace function public.remover_reinternacao(p_id bigint) returns void
language plpgsql security definer set search_path = public as $$
declare r public.reinternacoes;
begin
  if not public.perm('editar') then raise exception 'Sem permissão para editar.' using errcode = '42501'; end if;
  delete from public.reinternacoes where id = p_id returning * into r;
  if not found then raise exception 'Reinternação não encontrada.'; end if;
  insert into public.historico (paciente_id, usuario_id, autor, tipo, resumo, detalhes)
  values (r.paciente_id, auth.uid(), public.nome_do_usuario(), 'reinternacao', 'Reinternação removida',
          jsonb_build_object('data', r.data, 'motivo', r.motivo));
end $$;

-- Busca ativa: pessoas avaliadas para entrar no programa (ainda não são pacientes cadastrados).
create table if not exists public.busca_ativa (
  id bigint generated always as identity primary key,
  data date not null,
  paciente text not null,
  situacao text not null check (situacao in ('elegivel','inelegivel')),
  usuario_id uuid default auth.uid(),
  autor text not null default 'Sistema',
  criado_em timestamptz not null default now()
);
create index if not exists ix_busca_data on public.busca_ativa (data);
alter table public.busca_ativa enable row level security;
drop policy if exists ver_busca_ativa on public.busca_ativa;
create policy ver_busca_ativa on public.busca_ativa for select to authenticated using (public.perm('ver'));
revoke all on public.busca_ativa from anon;

create or replace function public.salvar_busca_ativa(p_data date, p_paciente text, p_situacao text) returns bigint
language plpgsql security definer set search_path = public as $$
declare v_id bigint;
begin
  if not public.perm('editar') then raise exception 'Sem permissão para editar.' using errcode = '42501'; end if;
  if p_data is null then raise exception 'Informe a data.'; end if;
  if length(trim(coalesce(p_paciente, ''))) < 2 or length(p_paciente) > 120 then raise exception 'Informe o nome do paciente.'; end if;
  if p_situacao not in ('elegivel','inelegivel') then raise exception 'Situação inválida.'; end if;
  insert into public.busca_ativa (data, paciente, situacao, autor)
  values (p_data, trim(p_paciente), p_situacao, public.nome_do_usuario())
  returning id into v_id;
  return v_id;
end $$;

create or replace function public.remover_busca_ativa(p_id bigint) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.perm('editar') then raise exception 'Sem permissão para editar.' using errcode = '42501'; end if;
  delete from public.busca_ativa where id = p_id;
  if not found then raise exception 'Registro não encontrado.'; end if;
end $$;

revoke execute on function public.definir_obito_do(bigint, boolean, text), public.definir_motivo_permanencia(bigint, text),
  public.definir_alta_tipo(bigint, text), public.salvar_reinternacao(bigint, date, text), public.remover_reinternacao(bigint),
  public.salvar_busca_ativa(date, text, text), public.remover_busca_ativa(bigint) from public, anon;
grant execute on function public.definir_obito_do(bigint, boolean, text), public.definir_motivo_permanencia(bigint, text),
  public.definir_alta_tipo(bigint, text), public.salvar_reinternacao(bigint, date, text), public.remover_reinternacao(bigint),
  public.salvar_busca_ativa(date, text, text), public.remover_busca_ativa(bigint) to authenticated;

notify pgrst, 'reload schema';
