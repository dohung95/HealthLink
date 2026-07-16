import React, { memo } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import './wallet-shared.css';

const DateInput = React.forwardRef(({ value, onClick, placeholder, inputId, ariaLabel }, ref) => (
  <input
    ref={ref}
    id={inputId}
    aria-label={ariaLabel || placeholder}
    value={value}
    onClick={onClick}
    placeholder={placeholder}
    readOnly
    className="wallet-date-input"
  />
));

const WalletDatePicker = memo(({ selected, onChange, placeholderText, inputId, ariaLabel }) => (
  <DatePicker
    selected={selected}
    onChange={onChange}
    dateFormat="MMM d, yyyy"
    placeholderText={placeholderText}
    isClearable
    popperPlacement="bottom-start"
    calendarClassName="wallet-datepicker-popper"
    customInput={<DateInput inputId={inputId} ariaLabel={ariaLabel} />}
  />
));

export default WalletDatePicker;
