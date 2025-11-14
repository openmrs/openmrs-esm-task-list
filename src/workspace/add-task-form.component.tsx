import React, { useCallback, useMemo, useState } from 'react';
import classNames from 'classnames';
import { useTranslation } from 'react-i18next';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, ButtonSet, ComboBox, Form, Layer, TextArea, TextInput } from '@carbon/react';
import { showSnackbar, useLayoutType, restBaseUrl, openmrsFetch, isDesktop } from '@openmrs/esm-framework';
import styles from './add-task-form.scss';
import { SelectOption, useProviderRoles, saveTask, taskListSWRKey, type TaskInput, useFetchProviders } from './task-list.resource';
import { useSWRConfig } from 'swr';

export interface AddTaskFormProps {
    patientUuid: string;
    onBack: () => void;
}

const AddTaskForm: React.FC<AddTaskFormProps> = ({ patientUuid, onBack }) => {

    const { t } = useTranslation();

    const isTablet = !isDesktop(useLayoutType());

    const { providers, setProviderQuery, isLoading, error } = useFetchProviders();

    const optionSchema = z.object({
        id: z.string(),
        label: z.string().optional(),
    });

    const { mutate } = useSWRConfig();

    const schema = z.object({
        taskName: z.string().min(1),
        dueDate: z.string().optional(),
        rationale: z.string().optional(),
        assignee: optionSchema.optional(),
        assigneeRole: optionSchema.optional(),
    }).refine(
        (values) => !(values.assignee && values.assigneeRole),
        { message: t('selectSingleAssignee', 'Select either a provider or a provider role, not both'), path: ['assigneeRole'] },
    );

    const { control, handleSubmit, setValue, formState: { errors } } = useForm<z.infer<typeof schema>>({
        resolver: zodResolver(schema),
        defaultValues: {
            taskName: '',
            dueDate: undefined,
            rationale: '',
            assignee: undefined,
            assigneeRole: undefined,
        },
    });

    const providerOptions = useMemo(() => providers.map((provider) => ({
        id: provider.uuid,
        label: provider.display,
    })), [providers]);
    const providerRoleOptions = useProviderRoles();

    const providerSearchHelper = useMemo(() => t('providerSearchHint', 'Start typing to search for providers'), [t]);
    const providerRoleSearchHelper = useMemo(() => t('providerRoleSearchHint', 'Start typing to search for provider roles'), [t]);

    const handleFormSubmission = async (data: z.infer<typeof schema>) => {
        try {
          const payload: TaskInput = {
            name: data.taskName.trim(),
            dueDate: data.dueDate?.trim() || undefined,
            rationale: data.rationale?.trim() || undefined,
            assignee: data.assignee ? { uuid: data.assignee.id, display: data.assignee.label, type: 'person' } : undefined,
            assigneeRole: data.assigneeRole ? { uuid: data.assigneeRole.id, display: data.assigneeRole.label, type: 'role' } : undefined,
          };

          await saveTask(patientUuid, payload);
          await mutate(taskListSWRKey(patientUuid));
          showSnackbar({
            title: t("taskAdded", "Task added"),
            kind: 'success',
          })
          onBack();
        } catch (error) {
          showSnackbar({
            title: t("taskAddFailed", "Task add failed"),
            kind: 'error',
          })
        }
    };

  return (
    <>
    <div className={styles.formContainer}>
      <Form onSubmit={handleSubmit(handleFormSubmission)}>
        <div className={styles.formSection}>
        <h5 className={styles.formSectionHeader}>{t("task", "Task")}</h5>
        <InputWrapper>
        <Controller
          name="taskName"
          control={control}
          render={({ field }) => (
            <TextInput
              id="taskName"
              labelText={t("taskNameLabel", "Task name")}
              placeholder={t("taskNamePlaceholder", "Enter task name")}
              invalid={Boolean(errors.taskName)}
              invalidText={errors.taskName?.message ? t("taskNameRequired", "Task name is required") : undefined}
              {...field}
            />
          )}
        />
        </InputWrapper>

        <InputWrapper>
          <Controller
            name="dueDate"
            control={control}
            render={({ field }) => (
              <TextInput
                id="dueDate"
                type="date"
                labelText={t("dueDateLabel", "Due date")}
                placeholder={t("dueDatePlaceholder", "Select a due date")}
                {...field}
              />
            )}
          />
        </InputWrapper>

        <InputWrapper>
          <Controller
            name="assignee"
            control={control}
            render={({ field }) => (
              <ComboBox
                id="assignee"
                titleText={t("assignProviderLabel", "Assign to provider")}
                placeholder={t("assignProviderPlaceholder", "Search providers")}
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

        <InputWrapper>
          <Controller
            name="assigneeRole"
            control={control}
            render={({ field }) => (
              <ComboBox
                id="assigneeRole"
                titleText={t("assignProviderRoleLabel", "Assign to provider role")}
                placeholder={t("assignProviderRolePlaceholder", "Search provider roles")}
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
        </div>

        <div className={styles.formSection}>
        <h5 className={styles.formSectionHeader}>{t("rationale", "Rationale")}</h5>
        <InputWrapper>
          <Controller
            name="rationale"
            control={control}
            render={({ field }) => (
              <TextArea
                id="rationale"
                labelText={t("rationaleLabel", "Explain briefly why this task is necessary (optional)")}
                placeholder={t("rationalePlaceholder", "Add a note here")}
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
              <ButtonSet                                                                                                                                                                                                                                           
              className={styles.buttonSet}                                                                                                                                              
            >                                                                                                                                                                                                                                                    
              <Button className={styles.button} kind="secondary" onClick={onBack} size="xl">                                                                                                                                                                   
                {t('discard', 'Discard')}                                                                                                                                                                                                                        
              </Button>                                                                                                                                                                                                                                          
              <Button                                                                                                                                                                                                                                            
                className={styles.button}                                                                                                                                                                                                                        
                kind="primary"                                                                                                                                                                                                                                   
                size="xl" 
                onClick={handleSubmit(handleFormSubmission)}                                                                                                                                                                                                                                       
              >                                                                                                                                                                                                                                                  
                {t("addTaskButton", "Add Task")}                                                                                                                                                                                                                                 
              </Button>                                                                                                                                                                                                                                          
            </ButtonSet>
            </>
  );
};

function InputWrapper({ children }) {                                                                            
    const isTablet = useLayoutType() === 'tablet';                                                                 
    return (                                                                                                       
      <Layer level={isTablet ? 1 : 0}>                                                                             
        <div className={styles.field}>{children}</div>                                                             
      </Layer>                                                                                                     
    );                                                                                                             
  }      

export default AddTaskForm;

