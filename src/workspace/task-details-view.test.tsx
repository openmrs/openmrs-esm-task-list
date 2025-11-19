import React from 'react';
import { render, screen } from '@testing-library/react';
import TaskDetailsView, { DueDateDisplay } from './task-details-view.component';
import { useTask, type Task } from './task-list.resource';
import { formatDate, isOmrsDateToday } from '@openmrs/esm-framework';

// Mock dependencies
jest.mock('./task-list.resource');
jest.mock('@openmrs/esm-framework', () => ({
  ...jest.requireActual('@openmrs/esm-framework'),
  formatDate: jest.fn(),
  isOmrsDateToday: jest.fn(),
  showSnackbar: jest.fn(),
}));

jest.mock('swr', () => ({
  useSWRConfig: () => ({ mutate: jest.fn() }),
}));

const mockUseTask = useTask as jest.MockedFunction<typeof useTask>;
const mockFormatDate = formatDate as jest.MockedFunction<typeof formatDate>;
const mockIsOmrsDateToday = isOmrsDateToday as jest.MockedFunction<typeof isOmrsDateToday>;

/**
 * Helper function to set up formatDate mock implementation.
 * @param options Configuration for the mock behavior
 * @param options.today Optional Date object representing "today" for comparison
 * @param options.todayString Optional string to return when a date matches "today"
 * @param options.handlesUndefined Optional flag to handle undefined/null dates explicitly
 */
function setupDateMocks(options: { today: Date }) {
  mockIsOmrsDateToday.mockImplementation((date: Date) => {
    return date.toISOString().split('T')[0] === options.today.toISOString().split('T')[0];
  });
  mockFormatDate.mockImplementation((date: Date) => {
    if (date === undefined || date === null) {
      return null;
    }

    const dateStr = date.toISOString().split('T')[0];

    const todayStr = options.today.toISOString().split('T')[0];
    if (dateStr === todayStr) {
      return 'Today';
    }

    return dateStr;
  });
}

describe('TaskDetailsView - Due Date Display Logic', () => {
  const mockOnBack = jest.fn();
  const mockOnEdit = jest.fn();
  const patientUuid = 'patient-uuid-123';
  const taskUuid = 'task-uuid-456';

  const baseTask: Task = {
    uuid: taskUuid,
    name: 'Test Task',
    status: 'not-started',
    createdDate: new Date('2024-01-15T10:00:00Z'),
    completed: false,
    createdBy: 'Test User',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Default mock for formatDate - return formatted date string
    setupDateMocks({ today: new Date() });
  });

  describe('DATE type tasks', () => {
    it('should display only due date (no scheduling info) when task was created today', () => {
      const today = new Date();
      const task: Task = {
        ...baseTask,
        createdDate: today,
        dueDate: {
          type: 'DATE',
          date: new Date('2024-01-20T10:00:00Z'),
        },
      };

      mockUseTask.mockReturnValue({
        task,
        isLoading: false,
        error: null,
        mutate: jest.fn(),
      });

      setupDateMocks({
        today,
      });

      render(<TaskDetailsView patientUuid={patientUuid} taskUuid={taskUuid} onBack={mockOnBack} onEdit={mockOnEdit} />);

      expect(screen.queryByText(/scheduled/i)).not.toBeInTheDocument();
      expect(screen.getByText(/due date/i)).toBeInTheDocument();
      expect(screen.getByText(/2024-01-20/i)).toBeInTheDocument();
    });

    it('should display only due date (no scheduling info) when task was created on a different date', () => {
      const task: Task = {
        ...baseTask,
        createdDate: new Date('2024-01-10T10:00:00Z'),
        dueDate: {
          type: 'DATE',
          date: new Date('2024-01-20T10:00:00Z'),
        },
      };

      mockUseTask.mockReturnValue({
        task,
        isLoading: false,
        error: null,
        mutate: jest.fn(),
      });

      setupDateMocks({
        today: new Date(),
      });

      render(<TaskDetailsView patientUuid={patientUuid} taskUuid={taskUuid} onBack={mockOnBack} onEdit={mockOnEdit} />);

      expect(screen.queryByText(/scheduled/i)).not.toBeInTheDocument();
      expect(screen.getByText(/due date/i)).toBeInTheDocument();
      expect(screen.getByText(/2024-01-20/i)).toBeInTheDocument();
    });
  });

  describe('THIS_VISIT type tasks', () => {
    it('should display "Scheduled today for this visit" when created today and visit is ongoing', () => {
      const today = new Date();
      const task: Task = {
        ...baseTask,
        createdDate: today,
        dueDate: {
          type: 'THIS_VISIT',
          // No date means visit is ongoing
        },
      };

      mockUseTask.mockReturnValue({
        task,
        isLoading: false,
        error: null,
        mutate: jest.fn(),
      });

      setupDateMocks({
        today,
      });

      render(<TaskDetailsView patientUuid={patientUuid} taskUuid={taskUuid} onBack={mockOnBack} onEdit={mockOnEdit} />);

      expect(screen.getByText(/today for this visit/i)).toBeInTheDocument();
      expect(screen.queryByText(/due date/i)).not.toBeInTheDocument();
    });

    it('should display "On {date} for the same visit" when created on different date but visit is multi-day and ongoing', () => {
      const task: Task = {
        ...baseTask,
        createdDate: new Date('2024-01-10T10:00:00Z'),
        dueDate: {
          type: 'THIS_VISIT',
          // No date means visit is ongoing
        },
      };

      mockUseTask.mockReturnValue({
        task,
        isLoading: false,
        error: null,
        mutate: jest.fn(),
      });

      setupDateMocks({
        today: new Date('2024-01-12T10:00:00Z'),
      });

      render(<TaskDetailsView patientUuid={patientUuid} taskUuid={taskUuid} onBack={mockOnBack} onEdit={mockOnEdit} />);

      expect(screen.getByText(/on 2024-01-10 for the same visit/i)).toBeInTheDocument();
      expect(screen.queryByText(/due date/i)).not.toBeInTheDocument();
    });

    it('should display due date when visit has ended', () => {
      const task: Task = {
        ...baseTask,
        createdDate: new Date('2024-01-10T10:00:00Z'),
        dueDate: {
          type: 'THIS_VISIT',
          date: new Date('2024-01-12T15:00:00Z'), // Visit ended
        },
      };

      mockUseTask.mockReturnValue({
        task,
        isLoading: false,
        error: null,
        mutate: jest.fn(),
      });

      setupDateMocks({ today: new Date() });

      render(<TaskDetailsView patientUuid={patientUuid} taskUuid={taskUuid} onBack={mockOnBack} onEdit={mockOnEdit} />);

      expect(screen.getByText(/on 2024-01-10 for the same visit/i)).toBeInTheDocument();
      expect(screen.getByText(/due date/i)).toBeInTheDocument();
      expect(screen.getByText(/2024-01-12/i)).toBeInTheDocument();
    });
  });

  describe('NEXT_VISIT type tasks', () => {
    it('should display "Scheduled today for next visit" when created today', () => {
      const today = new Date();
      const task: Task = {
        ...baseTask,
        createdDate: today,
        dueDate: {
          type: 'NEXT_VISIT',
          // No date means next visit hasn't ended yet
        },
      };

      mockUseTask.mockReturnValue({
        task,
        isLoading: false,
        error: null,
        mutate: jest.fn(),
      });

      setupDateMocks({
        today,
      });

      render(<TaskDetailsView patientUuid={patientUuid} taskUuid={taskUuid} onBack={mockOnBack} onEdit={mockOnEdit} />);

      expect(screen.getByText(/today for next visit/i)).toBeInTheDocument();
      expect(screen.queryByText(/due date/i)).not.toBeInTheDocument();
    });

    it('should display "On {date} for the following visit" when created in the past and next visit hasn\'t ended yet', () => {
      const task: Task = {
        ...baseTask,
        createdDate: new Date('2024-01-10T10:00:00Z'),
        dueDate: {
          type: 'NEXT_VISIT',
          // No date means next visit hasn't ended yet
        },
      };

      mockUseTask.mockReturnValue({
        task,
        isLoading: false,
        error: null,
        mutate: jest.fn(),
      });

      setupDateMocks({
        today: new Date(),
      });

      render(<TaskDetailsView patientUuid={patientUuid} taskUuid={taskUuid} onBack={mockOnBack} onEdit={mockOnEdit} />);

      expect(screen.getByText(/on 2024-01-10 for the following visit/i)).toBeInTheDocument();
      expect(screen.queryByText(/due date/i)).not.toBeInTheDocument();
    });

    it('should display due date when next visit has ended', () => {
      const task: Task = {
        ...baseTask,
        createdDate: new Date('2024-01-10T10:00:00Z'),
        dueDate: {
          type: 'NEXT_VISIT',
          date: new Date('2024-01-18T15:00:00Z'), // Next visit ended
        },
      };

      mockUseTask.mockReturnValue({
        task,
        isLoading: false,
        error: null,
        mutate: jest.fn(),
      });

      setupDateMocks({ today: new Date() });

      render(<TaskDetailsView patientUuid={patientUuid} taskUuid={taskUuid} onBack={mockOnBack} onEdit={mockOnEdit} />);

      expect(screen.getByText(/on 2024-01-10 for the following visit/i)).toBeInTheDocument();
      expect(screen.getByText(/due date/i)).toBeInTheDocument();
      expect(screen.getByText(/2024-01-18/i)).toBeInTheDocument();
    });
  });

  describe('Tasks with no due date', () => {
    it('should not display scheduling info or due date when task has no due date', () => {
      const task: Task = {
        ...baseTask,
        // No dueDate property
      };

      mockUseTask.mockReturnValue({
        task,
        isLoading: false,
        error: null,
        mutate: jest.fn(),
      });

      render(<TaskDetailsView patientUuid={patientUuid} taskUuid={taskUuid} onBack={mockOnBack} onEdit={mockOnEdit} />);

      expect(screen.queryByText(/scheduled/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/due date/i)).not.toBeInTheDocument();
    });
  });
});
