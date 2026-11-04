import { SelectField, type SelectOption } from '@/components/ui/SelectField';
import { TextField } from '@/components/ui/TextField';
import type { useEmployeeForm } from '../hooks/useEmployeeForm';
import { GENDER_OPTIONS } from '../labels';
import type { EmployeeDetail, EmployeeGender, EmployeeOptions } from '../types';

type GeneralDataFieldsProps = {
  form: ReturnType<typeof useEmployeeForm>;
  options: EmployeeOptions | undefined;
  errors: Record<string, string>;
  emailTaken?: string;
  isReadOnly?: boolean;
  // Valor atual da pessoa: se estiver desativado em Configurações, continua na lista.
  employee?: EmployeeDetail;
};

const sectionTitle = 'text-base font-semibold';
const sectionText = 'text-xs text-muted-foreground';

// Opções ativas, mais o valor atual da pessoa se ele foi desativado (spec 005, edge case).
function listOptions(
  items: { id: string; name: string }[] | undefined,
  current: { id: string; name: string; active: boolean } | undefined,
): SelectOption[] {
  const options = (items ?? []).map((item) => ({ value: item.id, label: item.name }));
  if (current && !options.some((option) => option.value === current.id)) {
    options.push({
      value: current.id,
      label: current.active ? current.name : `${current.name} (desativado)`,
    });
  }
  return options;
}

// Informações gerais e profissionais do funcionário (tela "Perfil do usuário" do sistema legado).
export function GeneralDataFields({
  form,
  options,
  errors,
  emailTaken,
  isReadOnly = false,
  employee,
}: GeneralDataFieldsProps) {
  const { values, setField } = form;
  return (
    <div className="flex flex-col gap-8">
      <section aria-labelledby="general-info" className="flex flex-col gap-4">
        <div>
          <h2 id="general-info" className={sectionTitle}>
            Informações gerais
          </h2>
          <p className={sectionText}>
            {isReadOnly ? 'Dados de contato da pessoa' : 'Complete as informações da pessoa'}
          </p>
        </div>
        <div className="grid gap-x-6 gap-y-4 md:grid-cols-2">
          <TextField
            label="Nome completo"
            isRequired={!isReadOnly}
            disabled={isReadOnly}
            maxLength={120}
            value={values.name}
            onChange={(event) => setField('name', event.target.value)}
            errorMessage={errors.name}
          />
          <SelectField
            label="Gênero"
            disabled={isReadOnly}
            placeholder={isReadOnly ? 'Não informado' : 'Escolha'}
            options={GENDER_OPTIONS}
            value={values.gender}
            onChange={(event) => setField('gender', event.target.value as EmployeeGender | '')}
            errorMessage={errors.gender}
          />
          <TextField
            label="Telefone (fixo)"
            disabled={isReadOnly}
            inputMode="tel"
            placeholder="(00) 0000-0000"
            value={values.landline}
            onChange={(event) => setField('landline', event.target.value)}
            errorMessage={errors.landline}
          />
          <TextField
            label="Celular"
            isRequired={!isReadOnly}
            disabled={isReadOnly}
            inputMode="tel"
            placeholder="(00) 90000-0000"
            value={values.mobile}
            onChange={(event) => setField('mobile', event.target.value)}
            errorMessage={
              errors.mobile ?? (isReadOnly && !values.mobile ? 'Complete o celular' : undefined)
            }
          />
          <TextField
            label="E-mail"
            isRequired={!isReadOnly}
            disabled={isReadOnly}
            type="email"
            placeholder="nome@farmarcas.com.br"
            value={values.email}
            onChange={(event) => setField('email', event.target.value)}
            errorMessage={errors.email ?? emailTaken}
          />
        </div>
      </section>

      <section aria-labelledby="professional-info" className="flex flex-col gap-4">
        <div>
          <h2 id="professional-info" className={sectionTitle}>
            Informações profissionais
          </h2>
          <p className={sectionText}>Departamento e ocupação vêm das listas de Configurações</p>
        </div>
        <div className="grid gap-x-6 gap-y-4 md:grid-cols-2">
          <SelectField
            label="Departamento"
            isRequired={!isReadOnly}
            disabled={isReadOnly}
            placeholder="Escolha o departamento"
            options={listOptions(options?.departments, employee?.department)}
            value={values.departmentId}
            onChange={(event) => setField('departmentId', event.target.value)}
            errorMessage={errors.departmentId}
          />
          <SelectField
            label="Ocupação"
            isRequired={!isReadOnly}
            disabled={isReadOnly}
            placeholder="Escolha a ocupação"
            options={listOptions(options?.occupations, employee?.occupation)}
            value={values.occupationId}
            onChange={(event) => setField('occupationId', event.target.value)}
            errorMessage={errors.occupationId}
          />
        </div>
      </section>
    </div>
  );
}
