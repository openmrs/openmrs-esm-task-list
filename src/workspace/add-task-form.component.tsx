import React, { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Button,
  ButtonSet,
  ComboBox,
  ContentSwitcher,
  Form,
  FormGroup,
  FormLabel,
  Layer,
  Switch,
  TextArea,
  TextInput,
} from '@carbon/react';
import {
  showSnackbar,
  useLayoutType,
  restBaseUrl,
  openmrsFetch,
  useConfig,
  parseDate,
  useVisit,
} from '@openmrs/esm-framework';
import type { FetchResponse } from '@openmrs/esm-framework';
import styles from './add-task-form.scss';
import {
  useProviderRoles,
  saveTask,
  taskListSWRKey,
  type TaskInput,
  useFetchProviders,
} from './task-list.resource';
import { useSWRConfig } from 'swr';
import useSWR from 'swr';

export interface AddTaskFormProps {
  patientUuid: string;
  onBack: () => void;
}

const AddTaskForm: React.FC<AddTaskFormProps> = ({ patientUuid, onBack }) => {
  const { t } = useTranslation();

  const { activeVisit, isLoading: isVisitLoading } = useVisit(patientUuid);

  const { providers, setProviderQuery, isLoading, error } = useFetchProviders();

  const { allowAssigningProviderRole } = useConfig();

  const optionSchema = z.object({
    id: z.string(),
    label: z.string().optional(),
  });

  const { mutate } = useSWRConfig();

  const schema = z
    .object({
      taskName: z.string().min(1),
      dueDateType: z.enum(['THIS_VISIT', 'NEXT_VISIT', 'DATE']).optional(),
      dueDate: z.string().optional(),
      rationale: z.string().optional(),
      assignee: optionSchema.optional(),
      assigneeRole: optionSchema.optional(),
    })
    .refine((values) => !(values.assignee && values.assigneeRole), {
      message: t('selectSingleAssignee', 'Select either a provider or a provider role, not both'),
      path: ['assigneeRole'],
    })
    .refine((values) => values.dueDateType !== 'DATE' || values.dueDate, {
      message: t('dueDateRequired', 'Due date is required when Date is selected'),
      path: ['dueDate'],
    });

  const {
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      taskName: '',
      dueDateType: undefined,
      dueDate: undefined,
      rationale: '',
      assignee: undefined,
      assigneeRole: undefined,
    },
  });

  const selectedDueDateType = watch('dueDateType');

  // Fetch current or last visit for NEXT_VISIT
  const referenceVisitUrl =
    selectedDueDateType === 'NEXT_VISIT'
      ? `${restBaseUrl}/visit?patient=${patientUuid}&v=custom:(uuid)&includeInactive=true&limit=1`
      : null;
  const {
    data: referenceVisitResponse,
    isLoading: isReferenceVisitLoading,
    error: referenceVisitError,
  } = useSWR<FetchResponse<{ results: Array<{ uuid: string }> }>>(referenceVisitUrl, openmrsFetch);
  const referenceVisitData = referenceVisitResponse?.data;

  const providerOptions = useMemo(
    () =>
      providers.map((provider) => ({
        id: provider.uuid,
        label: provider.display,
      })),
    [providers],
  );
  const providerRoleOptions = useProviderRoles();

  const providerSearchHelper = useMemo(() => t('providerSearchHint', 'Start typing to search for providers'), [t]);
  const providerRoleSearchHelper = useMemo(
    () => t('providerRoleSearchHint', 'Start typing to search for provider roles'),
    [t],
  );

  const handleFormSubmission = async (data: z.infer<typeof schema>) => {
    try {
      // Get visit UUID if THIS_VISIT or NEXT_VISIT is selected
      let visitUuid: string | undefined;
      if (data.dueDateType === 'THIS_VISIT') {
        visitUuid = activeVisit?.uuid;
      } else if (data.dueDateType === 'NEXT_VISIT') {
        visitUuid = referenceVisitData?.results?.[0]?.uuid;
      }

      const payload: TaskInput = {
        name: data.taskName.trim(),
        dueDate: {
          type: data.dueDateType,
          date: parseDate(data.dueDate),
          referenceVisitUuid: visitUuid,
        },
        rationale: data.rationale?.trim() || undefined,
        assignee: data.assignee
          ? { uuid: data.assignee.id, display: data.assignee.label, type: 'person' }
          : data.assigneeRole
            ? { uuid: data.assigneeRole.id, display: data.assigneeRole.label, type: 'role' }
            : undefined,
      };

      await saveTask(patientUuid, payload);
      await mutate(taskListSWRKey(patientUuid));
      showSnackbar({
        title: t('taskAdded', 'Task added'),
        kind: 'success',
      });
      onBack();
    } catch (error) {
      showSnackbar({
        title: t('taskAddFailed', 'Task add failed'),
        kind: 'error',
      });
    }
  };

  return (
    <>
      <div className={styles.formContainer}>
        <Form onSubmit={handleSubmit(handleFormSubmission)}>
          <div className={styles.formSection}>
            <h5 className={styles.formSectionHeader}>{t('task', 'Task')}</h5>
            <InputWrapper>
              <Controller
                name="taskName"
                control={control}
                render={({ field }) => (
                  <TextInput
                    id="taskName"
                    labelText={t('taskNameLabel', 'Task name')}
                    placeholder={t('taskNamePlaceholder', 'Enter task name')}
                    invalid={Boolean(errors.taskName)}
                    invalidText={errors.taskName?.message ? t('taskNameRequired', 'Task name is required') : undefined}
                    {...field}
                  />
                )}
              />
            </InputWrapper>

            <InputWrapper>
              <FormGroup legendText={t('dueLabel', 'Due')}>
                <Controller
                  name="dueDateType"
                  control={control}
                  render={({ field: { onChange, value } }) => {
                    const validDueDateTypes: Array<'NEXT_VISIT' | 'THIS_VISIT' | 'DATE'> = [
                      'NEXT_VISIT',
                      'THIS_VISIT',
                      'DATE',
                    ];
                    const idx = validDueDateTypes.indexOf(value as 'NEXT_VISIT' | 'THIS_VISIT' | 'DATE');
                    const selectedIndex = idx >= 0 ? idx : 0;

                    return (
                      <ContentSwitcher
                        selectedIndex={selectedIndex}
                        onChange={({ name }) => {
                          onChange(name);
                          if (name === 'NEXT_VISIT' || name === 'THIS_VISIT') {
                            setValue('dueDate', undefined);
                          }
                        }}
                        size="md"
                      >
                        <Switch
                          name="NEXT_VISIT"
                          text={t('nextVisit', 'Next visit')}
                          disabled={isReferenceVisitLoading || !!referenceVisitError}
                        />
                        <Switch
                          name="THIS_VISIT"
                          text={t('thisVisit', 'This visit')}
                          disabled={isVisitLoading || !activeVisit}
                        />
                        <Switch name="DATE" text={t('date', 'Date')} />
                      </ContentSwitcher>
                    );
                  }}
                />
              </FormGroup>
              {selectedDueDateType === 'DATE' && (
                <div className={styles.datePickerWrapper}>
                  <Controller
                    name="dueDate"
                    control={control}
                    render={({ field }) => (
                      <TextInput
                        id="dueDate"
                        type="date"
                        labelText=""
                        placeholder={t('dueDatePlaceholder', 'Select a due date')}
                        invalid={Boolean(errors.dueDate)}
                        invalidText={errors.dueDate?.message}
                        {...field}
                      />
                    )}
                  />
                </div>
              )}
            </InputWrapper>

            <InputWrapper>
              <Controller
                name="assignee"
                control={control}
                render={({ field }) => (
                  <ComboBox
                    id="assignee"
                    titleText={t('assignProviderLabel', 'Assign to provider')}
                    placeholder={t('assignProviderPlaceholder', 'Search providers')}
                    items={providerOptions}
                    itemToString={(item) => item?.label ?? ''}
                    selectedItem={field.value ?? null}
                    onChange={({ selectedItem }) => {
                      field.onChange(selectedItem ?? undefined);
                      if (selectedItem) {
                        setValue('assigneeRole', undefined, { shouldDirty: true, shouldValidate: true });
                      }
                    }}
                    onInputChange={(input) => setProviderQuery(input)}
                    helperText={providerSearchHelper}
                    invalid={Boolean(errors.assignee)}
                    invalidText={errors.assignee?.message}
                  />
                )}
              />
            </InputWrapper>

            {allowAssigningProviderRole && (
              <InputWrapper>
                <Controller
                  name="assigneeRole"
                  control={control}
                  render={({ field }) => (
                    <ComboBox
                      id="assigneeRole"
                      titleText={t('assignProviderRoleLabel', 'Assign to provider role')}
                      placeholder={t('assignProviderRolePlaceholder', 'Search provider roles')}
                      items={providerRoleOptions}
                      itemToString={(item) => item?.label ?? ''}
                      selectedItem={field.value ?? null}
                      onChange={({ selectedItem }) => {
                        field.onChange(selectedItem ?? undefined);
                        if (selectedItem) {
                          setValue('assignee', undefined, { shouldDirty: true, shouldValidate: true });
                        }
                      }}
                      helperText={providerRoleSearchHelper}
                      invalid={Boolean(errors.assigneeRole)}
                      invalidText={errors.assigneeRole?.message}
                    />
                  )}
                />
              </InputWrapper>
            )}
          </div>

          <div className={styles.formSection}>
            <h5 className={styles.formSectionHeader}>{t('rationale', 'Rationale')}</h5>
            <InputWrapper>
              <Controller
                name="rationale"
                control={control}
                render={({ field }) => (
                  <TextArea
                    id="rationale"
                    labelText={t('rationaleLabel', 'Explain briefly why this task is necessary (optional)')}
                    placeholder={t('rationalePlaceholder', 'Add a note here')}
                    rows={4}
                    enableCounter
                    maxLength={100}
                    {...field}
                  />
                )}
              />
            </InputWrapper>
          </div>
        </Form>
      </div>
      <ButtonSet className={styles.bottomButtons}>
        <Button className={styles.button} kind="secondary" onClick={onBack} size="xl">
          {t('discard', 'Discard')}
        </Button>
        <Button className={styles.button} kind="primary" size="xl" onClick={handleSubmit(handleFormSubmission)}>
          {t('addTaskButton', 'Add Task')}
        </Button>
      </ButtonSet>
    </>
  );
};

function InputWrapper({ children }: { children: React.ReactNode }) {
  const isTablet = useLayoutType() === 'tablet';
  return (
    <Layer level={isTablet ? 1 : 0}>
      <div className={styles.field}>{children}</div>
    </Layer>
  );
}

export default AddTaskForm;
