-- Permite tipo camionete (picape / SUV) além de carro e caminhão.

alter table public.modelos
  drop constraint if exists modelos_tipo_veiculo_check;

alter table public.modelos
  add constraint modelos_tipo_veiculo_check
  check (tipo_veiculo in ('carro', 'caminhao', 'camionete'));

comment on column public.modelos.tipo_veiculo is 'Tipo de veículo do modelo: carro, caminhão ou camionete.';
