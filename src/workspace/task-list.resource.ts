import { useMemo, useState } from 'react';
import useSWR from 'swr';
import useSWRImmutable from 'swr/immutable';
import {
  type FetchResponse,
  openmrsFetch,
  restBaseUrl,
  useOpenmrsSWR,
  parseDate,
  useDebounce,
} from '@openmrs/esm-framework';

export interface Assignee {
  uuid: string;
  display?: string;
  type: 'person' | 'role';
}

export interface Task {
  uuid: string;
  name: string;
  status?: string;
  dueDate?: string;
  rationale?: string;
  assignee?: Assignee;
  completed: boolean;
}

export interface TaskInput {
  name: string;
  dueDate?: string;
  rationale?: string;
  assignee?: Assignee;
}

export interface FHIRCarePlanResponse {
  entry: Array<{
    resource: fhir.CarePlan;
  }>;
}

export interface SelectOption {
  id: string;
  label?: string;
}

export interface ProviderSearchResponse {
  results: Array<{
    uuid: string;
    display: string;
  }>;
}

export interface ProviderRoleSearchResponse {
  results: Array<{
    uuid: string;
    name: string;
  }>;
}

const carePlanEndpoint = `${restBaseUrl}/tasks/careplan`;

export function taskListSWRKey(patientUuid: string) {
  return `${carePlanEndpoint}?subject=Patient/${patientUuid}`;
}

export function useTaskList(patientUuid: string) {
  const swrKey = taskListSWRKey(patientUuid);
  const { data, isLoading, error, mutate } = useSWR<{ data: FHIRCarePlanResponse }>(swrKey, openmrsFetch);

  const tasks = useMemo(() => {
    const parsedTasks = data?.data?.entry?.map((entry) => createTaskFromCarePlan(entry.resource)) ?? [];
    const validTasks = parsedTasks.filter((task) => Boolean(task.uuid));

    return validTasks.sort((a, b) => {
      if (a.completed !== b.completed) {
        return a.completed ? 1 : -1;
      }

      const aDue = parseDate(a.dueDate)?.getTime() ?? 0;
      const bDue = parseDate(b.dueDate)?.getTime() ?? 0;

      return aDue - bDue;
    });
  }, [data]);

  return { tasks, isLoading, error, mutate };
}

export function saveTask(patientUuid: string, task: TaskInput) {
  const carePlan = buildCarePlan(patientUuid, {
    ...task,
    status: 'not-started',
  });

  return openmrsFetch(carePlanEndpoint, {
    headers: {
      'Content-Type': 'application/json',
    },
    method: 'POST',
    body: JSON.stringify(carePlan),
  });
}

export function updateTask(patientUuid: string, task: Task) {
  const carePlan = buildCarePlan(patientUuid, task);

  return openmrsFetch(`${carePlanEndpoint}/${task.uuid}`, {
    headers: {
      'Content-Type': 'application/json',
    },
    method: 'PUT',
    body: JSON.stringify(carePlan),
  });
}

export function toggleTaskCompletion(patientUuid: string, task: Task, completed: boolean) {
  const status = completed ? 'completed' : task.status && task.status !== 'completed' ? task.status : 'in-progress';

  return updateTask(patientUuid, {
    ...task,
    completed,
    status,
  });
}

export function taskSWRKey(taskUuid: string) {
  return `${carePlanEndpoint}/${taskUuid}`;
}

export function useTask(taskUuid: string) {
  const swrKey = taskSWRKey(taskUuid);
  const { data, isLoading, error, mutate } = useSWR<{ data: fhir.CarePlan }>(swrKey, openmrsFetch);

  const task = useMemo(() => {
    if (!data?.data) {
      return null;
    }
    return createTaskFromCarePlan(data.data);
  }, [data]);

  return { task, isLoading, error, mutate };
}

export function deleteTask(taskUuid: string) {
  return openmrsFetch(`${carePlanEndpoint}/${taskUuid}`, {
    method: 'DELETE',
  });
}

function createTaskFromCarePlan(carePlan: fhir.CarePlan): Task {
  console.log('createTaskFromCarePlan', carePlan);
  const activity = carePlan?.activity?.[0];
  const detail = activity?.detail;

  const status = detail?.status;

  const performers = detail?.performer ?? [];
  const dueDate = extractDueDate(detail);

  const task: Task = {
    uuid: carePlan.id ?? '',
    name: detail?.description ?? '',
    status,
    dueDate,
    rationale: carePlan.description ?? undefined,
    completed: (status ?? '').toLowerCase() === 'completed',
  };

  performers.forEach((performer) => {
    const assignment = parseAssignment(performer);
    if (!assignment) {
      return;
    }
    if (assignment.type === 'provider') {
      task.assignee = assignment.value;
    }
    if (assignment.type === 'providerRole') {
      task.assignee = assignment.value;
    }
  });

  return task;
}

function buildCarePlan(patientUuid: string, task: Partial<Task> & Pick<Task, 'name'>) {
  const performer: Array<fhir.Reference> = [];

  if (task.assignee?.uuid) {
    performer.push({
      reference: `Practitioner/${task.assignee.uuid}`,
      display: task.assignee.display,
    });
  }

  if (task.assignee?.type === 'role' && task.assignee?.uuid) {
    performer.push({
      reference: `PractitionerRole/${task.assignee.uuid}`,
      display: task.assignee.display,
    });
  }

  const detail: fhir.CarePlanActivityDetail = {
    status: task.status ?? 'not-started',
    description: task.name,
  };

  if (performer.length > 0) {
    detail.performer = performer;
  }

  if (task.dueDate) {
    detail.scheduledPeriod = {
      end: task.dueDate,
    };
  }

  const carePlan: fhir.CarePlan = {
    resourceType: 'CarePlan',
    status: task.completed ? 'completed' : 'active',
    intent: 'plan',
    description: task.rationale,
    subject: {
      reference: `Patient/${patientUuid}`,
    },
    activity: [
      {
        detail,
      },
    ],
  };

  if (task.uuid) {
    carePlan.id = task.uuid;
  }

  return carePlan;
}

function parseAssignment(
  performer: fhir.Reference,
): { type: 'provider'; value: Assignee } | { type: 'providerRole'; value: Assignee } | undefined {
  if (!performer) {
    return undefined;
  }

  const reference = performer.reference ?? '';
  const [resourceType, identifier] = reference.split('/');

  if (resourceType === 'Practitioner' && identifier) {
    return {
      type: 'provider',
      value: {
        uuid: identifier,
        display: performer.display ?? undefined,
        type: 'person',
      },
    };
  }

  if (resourceType === 'PractitionerRole' && identifier) {
    return {
      type: 'providerRole',
      value: {
        uuid: identifier,
        display: performer.display ?? undefined,
        type: 'role',
      },
    };
  }

  console.warn('Unknown performer type', performer);
  return null;
}

function extractDueDate(detail?: fhir.CarePlanActivityDetail): string | null {
  if (!detail) {
    return null;
  }

  if (detail.scheduledPeriod?.end) {
    return detail.scheduledPeriod.end;
  }

  const timingEvent = detail.scheduledTiming?.event?.[0];
  if (timingEvent) {
    return timingEvent;
  }

  if (typeof detail.scheduledString === 'string' && detail.scheduledString.trim().length > 0) {
    return detail.scheduledString;
  }

  return null;
}

export function useFetchProviders() {
  const [query, setQuery] = useState<string>('');
  const debouncedQuery = useDebounce(query, 300);
  const url =
    debouncedQuery.length < 2
      ? null
      : `${restBaseUrl}/provider?q=${encodeURIComponent(debouncedQuery)}&v=custom:(uuid,display)`;
  const { data, isLoading, error } = useSWR<FetchResponse<ProviderSearchResponse>>(url, openmrsFetch);

  return {
    providers: data?.data?.results ?? [],
    setProviderQuery: setQuery,
    isLoading,
    error,
  };
}

export function useProviderRoles() {
  const response = useSWRImmutable<FetchResponse<ProviderRoleSearchResponse>>(
    `${restBaseUrl}/providerrole?v=custom:(uuid,name)`,
    openmrsFetch,
  );
  console.log('useProviderRoles', response);
  const results = response?.data?.data?.results ?? [];
  return results.map((result) => ({
    id: result.uuid,
    label: result.name,
  }));
}
