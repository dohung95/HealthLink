const ScheduleStepper = ({ steps, currentStep }) => {
    return (
        <div className="schedule-stepper">
            {steps.map((step, index) => {
                const stepNumber = index + 1;
                const isActive = stepNumber === currentStep;
                const isCompleted = stepNumber < currentStep;

                return (
                    <div key={step.key} className="schedule-stepper-item">
                        <div
                            className={[
                                'schedule-step-circle',
                                isActive ? 'active' : '',
                                isCompleted ? 'completed' : '',
                            ].join(' ')}
                        >
                            {isCompleted ? '✓' : stepNumber}
                        </div>

                        <span
                            className={[
                                'schedule-step-label',
                                isActive ? 'active' : '',
                            ].join(' ')}
                        >
                            {step.label}
                        </span>

                        {index < steps.length - 1 && (
                            <div
                                className={[
                                    'schedule-step-line',
                                    isCompleted ? 'completed' : '',
                                ].join(' ')}
                            />
                        )}
                    </div>
                );
            })}
        </div>
    );
}

export default ScheduleStepper;