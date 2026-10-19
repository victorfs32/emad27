-- EMAD 27 — versão 2: cadastro completo, histórico de alterações e permissões por profissional.
-- Execute no Supabase: SQL Editor > New query > colar tudo > Run.
-- Pode ser executado mais de uma vez. NÃO apaga dados: as tabelas da versão 1
-- (dados de teste) são apenas renomeadas para pacientes_v1 e evolucoes_v1.

do $$
begin
  if to_regclass('public.pacientes') is not null
     and not exists (select 1 from information_schema.columns
                     where table_schema = 'public' and table_name = 'pacientes' and column_name = 'prontuario') then
    drop view if exists public.pacientes_resumo;
    alter table public.evolucoes rename to evolucoes_v1;
    alter table public.pacientes rename to pacientes_v1;
  end if;
end $$;

-- ---------------------------------------------------------------- permissões
create table if not exists public.perfis (
  user_id uuid primary key references auth.users(id) on delete cascade,
  nome text not null,
  ativo boolean not null default true,
  admin boolean not null default false,
  pode_cadastrar boolean not null default false,
  pode_editar boolean not null default false,
  pode_exportar boolean not null default false,
  criado_em timestamptz not null default now()
);

-- Todo usuário novo (criado em Authentication > Users) ganha um perfil só de consulta.
-- O primeiro usuário do sistema vira administrador.
create or replace function public.criar_perfil() returns trigger
language plpgsql security definer set search_path = public as $$
declare primeiro boolean;
begin
  select not exists (select 1 from public.perfis) into primeiro;
  insert into public.perfis (user_id, nome, admin, pode_cadastrar, pode_editar, pode_exportar)
  values (new.id, coalesce(nullif(new.raw_user_meta_data->>'nome', ''), new.email), primeiro, primeiro, primeiro, primeiro)
  on conflict (user_id) do nothing;
  return new;
end $$;

drop trigger if exists ao_criar_usuario on auth.users;
create trigger ao_criar_usuario after insert on auth.users
  for each row execute function public.criar_perfil();

-- Usuários que já existem continuam com acesso total (administradores).
insert into public.perfis (user_id, nome, admin, pode_cadastrar, pode_editar, pode_exportar)
select id, coalesce(nullif(raw_user_meta_data->>'nome', ''), email), true, true, true, true
from auth.users
on conflict (user_id) do nothing;

create or replace function public.perm(p text) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((
    select case p
      when 'ver' then ativo
      when 'cadastrar' then ativo and (admin or pode_cadastrar)
      when 'editar' then ativo and (admin or pode_editar)
      when 'exportar' then ativo and (admin or pode_exportar)
      when 'admin' then ativo and admin
      else false end
    from public.perfis where user_id = auth.uid()), false)
$$;

create or replace function public.nome_do_usuario() returns text
language sql stable security definer set search_path = public as $$
  select coalesce((select nome from public.perfis where user_id = auth.uid()), 'Sistema')
$$;

-- ---------------------------------------------------------------- cadastros base
create table if not exists public.uapss (
  id bigint generated always as identity primary key,
  nome text not null unique,
  ativo boolean not null default true
);

create table if not exists public.cid10 (
  codigo text primary key,
  descricao text not null
);

create table if not exists public.pacientes (
  id bigint generated always as identity primary key,
  prontuario text not null unique,
  nome text not null,
  uaps_id bigint references public.uapss(id),
  situacao text not null default 'ativo'
    check (situacao in ('ativo','internado','alta','transferido','obito')),
  modalidade text check (modalidade in ('AD1','AD2','AD3')),
  situacao_data date,
  situacao_motivo text,
  situacao_obs text,
  data_nascimento date,
  admissao date not null,
  cpf text, cns text, rg text, nome_mae text,
  cep text, municipio text, bairro text, rua text, numero text, complemento text, referencia text,
  fisio text check (fisio in ('sim','nao','aguardando')),
  fisio_frequencia text, fisio_obs text,
  dieta_vias text[] not null default '{}',
  dieta_outra text, dieta_obs text,
  diurese text check (diurese in ('espontanea','svd','cistostomia','outra')),
  diurese_outra text,
  usa_fralda boolean,
  continencia text check (continencia in ('continente','incontinente','parcial')),
  tqt boolean, tqt_canula_tipo text, tqt_calibre text, tqt_ultima_troca date, tqt_obs text,
  lpp boolean,
  o2 boolean, o2_dispositivo text, o2_fluxo numeric(5,2), o2_regime text, o2_obs text,
  proxima_visita date,
  observacoes text,
  criado_em timestamptz not null default now(),
  criado_por uuid default auth.uid() references auth.users(id) on delete set null,
  atualizado_em timestamptz not null default now(),
  atualizado_por uuid references auth.users(id) on delete set null
);
create index if not exists ix2_pac_nome on public.pacientes (nome);
create index if not exists ix2_pac_cpf on public.pacientes (cpf);
create index if not exists ix2_pac_cns on public.pacientes (cns);
create index if not exists ix2_pac_bairro on public.pacientes (bairro);
create index if not exists ix2_pac_situacao on public.pacientes (situacao);
create index if not exists ix2_pac_uaps on public.pacientes (uaps_id);

create table if not exists public.telefones (
  id bigint generated always as identity primary key,
  paciente_id bigint not null references public.pacientes(id) on delete cascade,
  numero text not null,
  de_quem text not null check (de_quem in ('paciente','cuidador','familiar')),
  whatsapp boolean
);
create index if not exists ix2_tel_pac on public.telefones (paciente_id);

create table if not exists public.cuidadores (
  id bigint generated always as identity primary key,
  paciente_id bigint not null references public.pacientes(id) on delete cascade,
  nome text not null,
  principal boolean not null default false,
  vinculo text, telefone text, cns text, cpf text
);
create index if not exists ix2_cui_pac on public.cuidadores (paciente_id);
create index if not exists ix2_cui_cpf on public.cuidadores (cpf);

create table if not exists public.diagnosticos (
  id bigint generated always as identity primary key,
  paciente_id bigint not null references public.pacientes(id) on delete cascade,
  cid text not null,
  descricao text,
  principal boolean not null default false
);
create index if not exists ix2_dx_pac on public.diagnosticos (paciente_id);

create table if not exists public.lesoes_pressao (
  id bigint generated always as identity primary key,
  paciente_id bigint not null references public.pacientes(id) on delete cascade,
  localizacao text not null,
  classificacao text,
  cobertura text,
  data_avaliacao date
);
create index if not exists ix2_lpp_pac on public.lesoes_pressao (paciente_id);

-- Admissões anteriores (uma nova admissão preserva o acompanhamento anterior).
create table if not exists public.admissoes (
  id bigint generated always as identity primary key,
  paciente_id bigint not null references public.pacientes(id) on delete cascade,
  admissao date,
  saida date,
  situacao_saida text,
  motivo text,
  obs text,
  registrado_em timestamptz not null default now()
);
create index if not exists ix2_adm_pac on public.admissoes (paciente_id);

create table if not exists public.evolucoes (
  id bigint generated always as identity primary key,
  paciente_id bigint not null references public.pacientes(id) on delete cascade,
  data date not null,
  tipo text not null,
  texto text not null,
  usuario_id uuid,
  autor text not null default 'Sistema',
  criado_em timestamptz not null default now()
);
create index if not exists ix2_evo_pac on public.evolucoes (paciente_id, data desc);

create table if not exists public.historico (
  id bigint generated always as identity primary key,
  paciente_id bigint not null references public.pacientes(id) on delete cascade,
  em timestamptz not null default now(),
  usuario_id uuid,
  autor text not null,
  tipo text not null,
  resumo text not null,
  detalhes jsonb
);
create index if not exists ix2_his_pac on public.historico (paciente_id, em desc);

-- ---------------------------------------------------------------- gatilhos
create or replace function public.preencher_evolucao() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.usuario_id := auth.uid();
  new.autor := public.nome_do_usuario();
  return new;
end $$;
drop trigger if exists ao_inserir_evolucao on public.evolucoes;
create trigger ao_inserir_evolucao before insert on public.evolucoes
  for each row execute function public.preencher_evolucao();

create or replace function public.marcar_atualizacao() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.atualizado_em := now();
  new.atualizado_por := auth.uid();
  return new;
end $$;
drop trigger if exists ao_atualizar_paciente on public.pacientes;
create trigger ao_atualizar_paciente before update on public.pacientes
  for each row execute function public.marcar_atualizacao();

-- Histórico automático: quem mudou, quando, e de/para em cada campo.
create or replace function public.auditar_paciente() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  dif jsonb := '{}'::jsonb; k text; o jsonb; n jsonb; tp text := 'alteracao';
begin
  if tg_op = 'INSERT' then
    insert into public.historico (paciente_id, usuario_id, autor, tipo, resumo)
    values (new.id, auth.uid(), public.nome_do_usuario(), 'cadastro', 'Cadastro criado');
    return new;
  end if;
  o := to_jsonb(old); n := to_jsonb(new);
  for k in select jsonb_object_keys(n) loop
    continue when k in ('atualizado_em', 'atualizado_por', 'criado_em', 'criado_por');
    if (o -> k) is distinct from (n -> k) then
      dif := dif || jsonb_build_object(k, jsonb_build_object('de', o -> k, 'para', n -> k));
    end if;
  end loop;
  if dif <> '{}'::jsonb then
    if dif ? 'situacao' then tp := 'situacao'; end if;
    insert into public.historico (paciente_id, usuario_id, autor, tipo, resumo, detalhes)
    values (new.id, auth.uid(), public.nome_do_usuario(), tp,
            case when tp = 'situacao' then 'Situação alterada' else 'Dados atualizados' end, dif);
  end if;
  return new;
end $$;
drop trigger if exists ao_auditar_paciente on public.pacientes;
create trigger ao_auditar_paciente after insert or update on public.pacientes
  for each row execute function public.auditar_paciente();

-- ---------------------------------------------------------------- funções de gravação
-- Toda gravação em pacientes passa por estas funções (checam a permissão e gravam tudo ou nada).
create or replace function public.salvar_paciente(p_id bigint, p jsonb) returns bigint
language plpgsql security definer set search_path = public as $$
declare
  v_id bigint := p_id;
  cols text := 'prontuario, nome, uaps_id, situacao, modalidade, situacao_data, situacao_motivo, situacao_obs, '
    'data_nascimento, admissao, cpf, cns, rg, nome_mae, cep, municipio, bairro, rua, numero, complemento, referencia, '
    'fisio, fisio_frequencia, fisio_obs, dieta_vias, dieta_outra, dieta_obs, diurese, diurese_outra, usa_fralda, continencia, '
    'tqt, tqt_canula_tipo, tqt_calibre, tqt_ultima_troca, tqt_obs, lpp, o2, o2_dispositivo, o2_fluxo, o2_regime, o2_obs, '
    'proxima_visita, observacoes';
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
      insert into public.cuidadores (paciente_id, nome, principal, vinculo, telefone, cns, cpf)
      select v_id, x.nome, coalesce(x.principal, false), x.vinculo, x.telefone, x.cns, x.cpf
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

create or replace function public.definir_proxima_visita(p_id bigint, p_data date) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.perm('editar') then raise exception 'Sem permissão para editar.' using errcode = '42501'; end if;
  update public.pacientes set proxima_visita = p_data where id = p_id;
end $$;

-- Nova admissão: guarda a admissão anterior em "admissoes" e reabre o acompanhamento.
create or replace function public.nova_admissao(p_id bigint, p_data date) returns void
language plpgsql security definer set search_path = public as $$
declare r public.pacientes;
begin
  if not public.perm('editar') then raise exception 'Sem permissão para editar.' using errcode = '42501'; end if;
  select * into r from public.pacientes where id = p_id;
  if not found then raise exception 'Paciente não encontrado.'; end if;
  insert into public.admissoes (paciente_id, admissao, saida, situacao_saida, motivo, obs)
  values (p_id, r.admissao, r.situacao_data, r.situacao, r.situacao_motivo, r.situacao_obs);
  update public.pacientes
     set admissao = p_data, situacao = 'ativo', situacao_data = null, situacao_motivo = null, situacao_obs = null
   where id = p_id;
  insert into public.historico (paciente_id, usuario_id, autor, tipo, resumo, detalhes)
  values (p_id, auth.uid(), public.nome_do_usuario(), 'admissao', 'Nova admissão',
          jsonb_build_object('admissao_anterior', r.admissao, 'nova_admissao', p_data));
end $$;

-- ---------------------------------------------------------------- listagem
create or replace view public.pacientes_resumo with (security_invoker = true) as
select p.id, p.prontuario, p.nome, p.data_nascimento, p.cpf, p.cns, p.situacao, p.modalidade,
       p.uaps_id, u.nome as uaps, p.bairro, p.admissao, p.fisio, p.dieta_vias, p.diurese,
       p.tqt, p.lpp, p.o2, p.proxima_visita,
       (select max(e.data) from public.evolucoes e where e.paciente_id = p.id) as ultima_evolucao
from public.pacientes p
left join public.uapss u on u.id = p.uaps_id;

-- ---------------------------------------------------------------- segurança (RLS)
alter table public.perfis enable row level security;
alter table public.uapss enable row level security;
alter table public.cid10 enable row level security;
alter table public.pacientes enable row level security;
alter table public.telefones enable row level security;
alter table public.cuidadores enable row level security;
alter table public.diagnosticos enable row level security;
alter table public.lesoes_pressao enable row level security;
alter table public.admissoes enable row level security;
alter table public.evolucoes enable row level security;
alter table public.historico enable row level security;

do $$
declare t text;
begin
  foreach t in array array['uapss','cid10','pacientes','telefones','cuidadores','diagnosticos','lesoes_pressao','admissoes','historico','evolucoes']
  loop
    execute format('drop policy if exists ver_%1$s on public.%1$I', t);
    execute format('create policy ver_%1$s on public.%1$I for select to authenticated using (public.perm(''ver''))', t);
  end loop;
end $$;

drop policy if exists perfis_ver on public.perfis;
create policy perfis_ver on public.perfis for select to authenticated
  using (user_id = auth.uid() or public.perm('admin'));
drop policy if exists perfis_admin on public.perfis;
create policy perfis_admin on public.perfis for update to authenticated
  using (public.perm('admin')) with check (public.perm('admin'));

drop policy if exists uapss_novo on public.uapss;
create policy uapss_novo on public.uapss for insert to authenticated
  with check (public.perm('cadastrar') or public.perm('editar'));

drop policy if exists evolucoes_novo on public.evolucoes;
create policy evolucoes_novo on public.evolucoes for insert to authenticated
  with check (public.perm('editar'));

-- Ninguém escreve direto em pacientes, listas e histórico: só pelas funções acima.
revoke all on all tables in schema public from anon;
revoke all on all functions in schema public from anon;
revoke execute on function public.salvar_paciente(bigint, jsonb), public.definir_proxima_visita(bigint, date), public.nova_admissao(bigint, date) from public;
grant execute on function public.salvar_paciente(bigint, jsonb) to authenticated;
grant execute on function public.definir_proxima_visita(bigint, date) to authenticated;
grant execute on function public.nova_admissao(bigint, date) to authenticated;

-- ---------------------------------------------------------------- CID-10 (lista inicial)
-- Códigos comuns na atenção domiciliar. É possível digitar qualquer outro CID na ficha,
-- e a lista completa do CID-10 pode ser importada depois (Table Editor > cid10 > Import CSV).
insert into public.cid10 (codigo, descricao) values
('I10','Hipertensão essencial (primária)'),('I25','Doença isquêmica crônica do coração'),
('I48','Fibrilação e flutter atrial'),('I50','Insuficiência cardíaca'),('I42','Cardiomiopatias'),
('I63','Infarto cerebral'),('I64','Acidente vascular cerebral, não especificado como hemorrágico ou isquêmico'),
('I69','Sequelas de doenças cerebrovasculares'),('I69.3','Sequelas de infarto cerebral'),
('E10','Diabetes mellitus insulino-dependente'),('E11','Diabetes mellitus não-insulino-dependente'),
('E03','Outros hipotireoidismos'),('E66','Obesidade'),('E78','Distúrbios do metabolismo de lipoproteínas'),
('E46','Desnutrição proteico-calórica não especificada'),('R64','Caquexia'),
('G30','Doença de Alzheimer'),('G20','Doença de Parkinson'),('G35','Esclerose múltipla'),
('G40','Epilepsia'),('G12.2','Doença do neurônio motor (ELA)'),('G80','Paralisia cerebral'),
('G81','Hemiplegia'),('G82','Paraplegia e tetraplegia'),('G83','Outras síndromes paralíticas'),
('G91','Hidrocefalia'),('G93.1','Lesão encefálica anóxica'),('F03','Demência não especificada'),
('F20','Esquizofrenia'),('F32','Episódio depressivo'),('Q90','Síndrome de Down'),
('J44','Outras doenças pulmonares obstrutivas crônicas'),('J96','Insuficiência respiratória'),
('J18','Pneumonia por microorganismo não especificado'),('J69','Pneumonite devida a sólidos e líquidos'),
('N18','Doença renal crônica'),('N39.0','Infecção do trato urinário de localização não especificada'),
('N40','Hiperplasia da próstata'),('K74','Fibrose e cirrose hepáticas'),('D64','Outras anemias'),
('C18','Neoplasia maligna do cólon'),('C34','Neoplasia maligna dos brônquios e dos pulmões'),
('C50','Neoplasia maligna da mama'),('C61','Neoplasia maligna da próstata'),
('C80','Neoplasia maligna, sem especificação de localização'),
('L89','Úlcera de decúbito (lesão por pressão)'),('L97','Úlcera dos membros inferiores'),
('M16','Coxartrose [artrose do quadril]'),('M17','Gonartrose [artrose do joelho]'),
('M54','Dorsalgia'),('M80','Osteoporose com fratura patológica'),('S72','Fratura do fêmur'),
('A41','Outras septicemias'),('B20','Doença pelo HIV resultando em doenças infecciosas e parasitárias'),
('A15','Tuberculose respiratória'),('U07.1','COVID-19, vírus identificado'),('R13','Disfagia'),
('R26','Anormalidades da marcha e da mobilidade'),
('Z51.5','Cuidados paliativos'),('Z74.0','Problemas relacionados com a mobilidade reduzida'),
('Z74.1','Necessidade de assistência para cuidados pessoais'),
('Z93.0','Traqueostomia'),('Z93.1','Gastrostomia'),('Z99.1','Dependência de respirador'),
('Z99.3','Dependência de cadeira de rodas')
on conflict (codigo) do nothing;

notify pgrst, 'reload schema';

-- ================================================================ versão 3: dispositivos

create table if not exists public.dispositivos (
  id bigint generated always as identity primary key,
  paciente_id bigint not null references public.pacientes(id) on delete cascade,
  tipo text not null check (tipo in ('gtt','sng','svd')),
  numero text,
  confeccao text,
  troca date,
  proxima_troca date,
  obs text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create index if not exists ix3_disp_pac on public.dispositivos (paciente_id);
create index if not exists ix3_disp_proxima on public.dispositivos (proxima_troca);

alter table public.dispositivos enable row level security;
drop policy if exists ver_dispositivos on public.dispositivos;
create policy ver_dispositivos on public.dispositivos for select to authenticated using (public.perm('ver'));

create or replace function public.rotulo_dispositivo(t text) returns text
language sql immutable as $$
  select case t when 'gtt' then 'Gastrostomia (GTT)' when 'sng' then 'Sonda nasogástrica (SNG)'
    when 'svd' then 'Sonda vesical de demora (SVD)' else t end
$$;

-- Cria (p_id nulo) ou atualiza um dispositivo e registra no histórico do paciente.
create or replace function public.salvar_dispositivo(p_id bigint, p_paciente bigint, p jsonb) returns bigint
language plpgsql security definer set search_path = public as $$
declare v_id bigint := p_id; novo public.dispositivos; antigo jsonb;
begin
  if not public.perm('editar') then raise exception 'Sem permissão para editar.' using errcode = '42501'; end if;
  novo := jsonb_populate_record(null::public.dispositivos, p);
  if p_id is null then
    if not exists (select 1 from public.pacientes where id = p_paciente) then raise exception 'Paciente não encontrado.'; end if;
    insert into public.dispositivos (paciente_id, tipo, numero, confeccao, troca, proxima_troca, obs)
    values (p_paciente, novo.tipo, novo.numero, novo.confeccao, novo.troca, novo.proxima_troca, novo.obs)
    returning id into v_id;
    insert into public.historico (paciente_id, usuario_id, autor, tipo, resumo, detalhes)
    values (p_paciente, auth.uid(), public.nome_do_usuario(), 'dispositivo',
            'Dispositivo registrado: ' || public.rotulo_dispositivo(novo.tipo), p);
  else
    select to_jsonb(d) - 'id' - 'paciente_id' - 'criado_em' - 'atualizado_em' into antigo from public.dispositivos d where id = p_id;
    if antigo is null then raise exception 'Dispositivo não encontrado.'; end if;
    update public.dispositivos
       set tipo = novo.tipo, numero = novo.numero, confeccao = novo.confeccao, troca = novo.troca,
           proxima_troca = novo.proxima_troca, obs = novo.obs, atualizado_em = now()
     where id = p_id returning paciente_id into p_paciente;
    insert into public.historico (paciente_id, usuario_id, autor, tipo, resumo, detalhes)
    values (p_paciente, auth.uid(), public.nome_do_usuario(), 'dispositivo',
            'Dispositivo atualizado: ' || public.rotulo_dispositivo(novo.tipo), jsonb_build_object('de', antigo, 'para', p));
  end if;
  return v_id;
end $$;

-- Registra uma troca: nova data de troca e próxima troca.
create or replace function public.registrar_troca(p_id bigint, p_troca date, p_proxima date) returns void
language plpgsql security definer set search_path = public as $$
declare d public.dispositivos;
begin
  if not public.perm('editar') then raise exception 'Sem permissão para editar.' using errcode = '42501'; end if;
  select * into d from public.dispositivos where id = p_id;
  if not found then raise exception 'Dispositivo não encontrado.'; end if;
  update public.dispositivos set troca = p_troca, proxima_troca = p_proxima, atualizado_em = now() where id = p_id;
  insert into public.historico (paciente_id, usuario_id, autor, tipo, resumo, detalhes)
  values (d.paciente_id, auth.uid(), public.nome_do_usuario(), 'dispositivo',
          'Troca registrada: ' || public.rotulo_dispositivo(d.tipo),
          jsonb_build_object('troca_anterior', d.troca, 'troca', p_troca, 'proxima_troca', p_proxima));
end $$;

create or replace function public.remover_dispositivo(p_id bigint) returns void
language plpgsql security definer set search_path = public as $$
declare d public.dispositivos;
begin
  if not public.perm('editar') then raise exception 'Sem permissão para editar.' using errcode = '42501'; end if;
  delete from public.dispositivos where id = p_id returning * into d;
  if not found then raise exception 'Dispositivo não encontrado.'; end if;
  insert into public.historico (paciente_id, usuario_id, autor, tipo, resumo, detalhes)
  values (d.paciente_id, auth.uid(), public.nome_do_usuario(), 'dispositivo',
          'Dispositivo removido: ' || public.rotulo_dispositivo(d.tipo),
          jsonb_build_object('numero', d.numero, 'troca', d.troca, 'proxima_troca', d.proxima_troca));
end $$;

revoke execute on function public.salvar_dispositivo(bigint, bigint, jsonb), public.registrar_troca(bigint, date, date),
  public.remover_dispositivo(bigint) from public;
grant execute on function public.salvar_dispositivo(bigint, bigint, jsonb) to authenticated;
grant execute on function public.registrar_troca(bigint, date, date) to authenticated;
grant execute on function public.remover_dispositivo(bigint) to authenticated;
revoke all on public.dispositivos from anon;

notify pgrst, 'reload schema';

-- ================================================================ versão 4: procedimentos
create table if not exists public.procedimentos (
  id bigint generated always as identity primary key,
  paciente_id bigint not null references public.pacientes(id) on delete cascade,
  data date not null,
  tipo text not null,
  obs text,
  usuario_id uuid,
  autor text not null default 'Sistema',
  criado_em timestamptz not null default now()
);
create index if not exists ix4_proc_pac on public.procedimentos (paciente_id, data desc);
create index if not exists ix4_proc_data on public.procedimentos (data desc);

alter table public.procedimentos enable row level security;
drop policy if exists ver_procedimentos on public.procedimentos;
create policy ver_procedimentos on public.procedimentos for select to authenticated using (public.perm('ver'));
drop policy if exists procedimentos_novo on public.procedimentos;
create policy procedimentos_novo on public.procedimentos for insert to authenticated with check (public.perm('editar'));

-- Quem registrou e quando é preenchido pelo banco (não pode ser falsificado pelo navegador).
drop trigger if exists ao_inserir_procedimento on public.procedimentos;
create trigger ao_inserir_procedimento before insert on public.procedimentos
  for each row execute function public.preencher_evolucao();

create or replace function public.remover_procedimento(p_id bigint) returns void
language plpgsql security definer set search_path = public as $$
declare d public.procedimentos;
begin
  if not public.perm('editar') then raise exception 'Sem permissão para editar.' using errcode = '42501'; end if;
  delete from public.procedimentos where id = p_id returning * into d;
  if not found then raise exception 'Procedimento não encontrado.'; end if;
  insert into public.historico (paciente_id, usuario_id, autor, tipo, resumo, detalhes)
  values (d.paciente_id, auth.uid(), public.nome_do_usuario(), 'procedimento', 'Procedimento removido: ' || d.tipo,
          jsonb_build_object('data', d.data, 'obs', d.obs, 'registrado_por', d.autor));
end $$;

-- Corrige registro feito por engano (ex.: visita lançada duas vezes). Fica no histórico.
create or replace function public.remover_evolucao(p_id bigint) returns void
language plpgsql security definer set search_path = public as $$
declare d public.evolucoes;
begin
  if not public.perm('editar') then raise exception 'Sem permissão para editar.' using errcode = '42501'; end if;
  delete from public.evolucoes where id = p_id returning * into d;
  if not found then raise exception 'Registro não encontrado.'; end if;
  insert into public.historico (paciente_id, usuario_id, autor, tipo, resumo, detalhes)
  values (d.paciente_id, auth.uid(), public.nome_do_usuario(), 'evolucao', 'Registro removido: ' || d.tipo,
          jsonb_build_object('data', d.data, 'texto', d.texto, 'registrado_por', d.autor));
end $$;

-- A troca de um dispositivo também entra em Procedimentos (sem digitar duas vezes).
create or replace function public.registrar_troca(p_id bigint, p_troca date, p_proxima date) returns void
language plpgsql security definer set search_path = public as $$
declare d public.dispositivos;
begin
  if not public.perm('editar') then raise exception 'Sem permissão para editar.' using errcode = '42501'; end if;
  select * into d from public.dispositivos where id = p_id;
  if not found then raise exception 'Dispositivo não encontrado.'; end if;
  update public.dispositivos set troca = p_troca, proxima_troca = p_proxima, atualizado_em = now() where id = p_id;
  insert into public.historico (paciente_id, usuario_id, autor, tipo, resumo, detalhes)
  values (d.paciente_id, auth.uid(), public.nome_do_usuario(), 'dispositivo',
          'Troca registrada: ' || public.rotulo_dispositivo(d.tipo),
          jsonb_build_object('troca_anterior', d.troca, 'troca', p_troca, 'proxima_troca', p_proxima));
  insert into public.procedimentos (paciente_id, data, tipo, obs)
  values (d.paciente_id, p_troca, upper(d.tipo), 'Troca registrada pelo controle de dispositivos' ||
          coalesce(' (nº ' || nullif(d.numero, '') || ')', ''));
end $$;

revoke execute on function public.remover_procedimento(bigint), public.remover_evolucao(bigint),
  public.registrar_troca(bigint, date, date) from public;
grant execute on function public.remover_procedimento(bigint) to authenticated;
grant execute on function public.remover_evolucao(bigint) to authenticated;
grant execute on function public.registrar_troca(bigint, date, date) to authenticated;
revoke all on public.procedimentos from anon;

notify pgrst, 'reload schema';
