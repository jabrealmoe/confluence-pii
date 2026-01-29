// Mock for @forge/react
const React = require('react');

const ForgeReconciler = {
  render: jest.fn((component) => ({
    run: jest.fn(),
  })),
};

const Text = ({ children }) => React.createElement('text', null, children);
const Button = ({ children, onClick, appearance }) => 
  React.createElement('button', { onClick, 'data-appearance': appearance }, children);
const Toggle = ({ label, isChecked, onChange }) => 
  React.createElement('toggle', { 'data-label': label, 'data-checked': isChecked, onChange });
const Stack = ({ children, space }) => 
  React.createElement('stack', { 'data-space': space }, children);
const Heading = ({ children, as }) => 
  React.createElement(as || 'h1', null, children);
const Form = ({ children, onSubmit, submitButtonText }) => 
  React.createElement('form', { onSubmit }, children);
const CheckboxGroup = ({ children, name, label }) => 
  React.createElement('checkboxgroup', { name, 'data-label': label }, children);
const Checkbox = ({ label, value, defaultChecked }) => 
  React.createElement('checkbox', { value, 'data-label': label, defaultChecked });

module.exports = {
  default: ForgeReconciler,
  ForgeReconciler,
  Text,
  Button,
  Toggle,
  Stack,
  Heading,
  Form,
  CheckboxGroup,
  Checkbox,
};
