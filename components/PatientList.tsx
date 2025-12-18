
import React from 'react';
import { FixedSizeGrid as Grid } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
import PatientCard from './PatientCard';
import { Patient } from '../types';

interface PatientListProps {
  patients: Patient[];
  onPatientClick: (patient: Patient) => void;
  onAddTask: (patientId: string) => void;
  onToggleTask: (patientId: string, taskId: string) => void;
  onDeleteTask: (patientId: string, taskId: string) => void;
  onEditTask: (patientId: string, taskId: string) => void;
  onScan: (patientId: string) => void;
  isPresentationMode: boolean;
}

const PatientList: React.FC<PatientListProps> = ({
  patients,
  onPatientClick,
  onAddTask,
  onToggleTask,
  onDeleteTask,
  onEditTask,
  onScan,
  isPresentationMode
}) => {
  const GUTTER_SIZE = 24; // Increased spacing between cards
  const CARD_HEIGHT = isPresentationMode ? 200 : 260; // Adjusted for better proportions

  return (
    <div className="w-full h-full min-h-[500px]">
      <AutoSizer>
        {({ height, width }: { height: number; width: number }) => {
          // Determine columns based on width
          let columnCount = 1;
          if (!isPresentationMode) {
            if (width >= 1400) columnCount = 3; // xl
            else if (width >= 900) columnCount = 2; // md
          }

          const columnWidth = Math.floor((width - (GUTTER_SIZE * (columnCount + 1))) / columnCount);
          const rowCount = Math.ceil(patients.length / columnCount);
          const rowHeight = CARD_HEIGHT + GUTTER_SIZE;

          const Cell = ({ columnIndex, rowIndex, style }: any) => {
            const index = rowIndex * columnCount + columnIndex;
            if (index >= patients.length) return null;
            
            const patient = patients[index];
            
            const itemStyle = {
                ...style,
                left: (style.left as number) + GUTTER_SIZE,
                top: (style.top as number) + GUTTER_SIZE,
                width: columnWidth,
                height: CARD_HEIGHT,
            };

            return (
              <div style={itemStyle}>
                <PatientCard
                    patient={patient}
                    onClick={() => onPatientClick(patient)}
                    onAddTask={() => onAddTask(patient.id)}
                    onToggleTask={(tid) => onToggleTask(patient.id, tid)}
                    onDeleteTask={(tid) => onDeleteTask(patient.id, tid)}
                    onEditTask={(tid) => onEditTask(patient.id, tid)}
                    onScan={() => onScan(patient.id)}
                    isPresentationMode={isPresentationMode}
                />
              </div>
            );
          };

          return (
            <Grid
              className="scrollbar-hide"
              columnCount={columnCount}
              columnWidth={columnWidth + GUTTER_SIZE}
              height={height}
              rowCount={rowCount}
              rowHeight={rowHeight}
              width={width}
              itemData={patients}
            >
              {Cell}
            </Grid>
          );
        }}
      </AutoSizer>
    </div>
  );
};

export default PatientList;
