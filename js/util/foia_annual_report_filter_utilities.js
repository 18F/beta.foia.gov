import annualReportDataFormStore from '../stores/annual_report_data_form';
import { List } from 'immutable';
import annualReportStore, { AnnualReportStore } from '../stores/annual_report';
import annualReportDataTypesStore from '../stores/annual_report_data_types';

/**
 * Provides utility functions for comparing rows of data with applied filters.
 */
class FoiaAnnualReportFilterUtilities {
  static filterByDataTypeConditions(rows, filters) {
    return rows.filter(row => FoiaAnnualReportFilterUtilities.passesAny(row, filters));
  }

  /**
   * Checks that a row passes any of the filters.
   *
   * @param row
   * @param filters
   * @returns {boolean}
   */
  static passesAny(row, filters) {
    // @todo Should the filters only be applied per data type?
    // Eg, a processing time filter should not be applied to exemption 3 statutes.
    if (filters.length === 0) {
      return true;
    }
    const passes = filters.filter((filter) => {
      const { compareValue, filterField, op } = filter;
      const value = FoiaAnnualReportFilterUtilities.getValue(filterField, row);
      return this.compare(op, value, compareValue);
    });

    return passes.length > 0;
  }

  /**
   * Gets filters for a given data type.
   *
   * @param dataTypeId
   * @returns {unknown[]}
   */
  static getFiltersForType(dataTypeId) {
    const selectedDataTypes = [...annualReportDataFormStore.getState().selectedDataTypes];
    let filters = selectedDataTypes
      .filter(type => (
        typeof type.filter === 'object' && type.filter !== null
      ))
      // Filter out any selected data type that doesn't match the passed in data type.
      // This prevents attempting to apply filters to a row where the data type
      // is not the same.
      .filter(type => type.id === dataTypeId)
      .map(type => type.filter)
      .filter(filter => filter.applied);

    if (this.filterOnOverallFields()) {
      filters = this.transformToOverallFilters(filters, dataTypeId);
    }
    return filters;
  }

  static filterOnOverallFields() {
    const selectedAgencies = AnnualReportStore.getSelectedAgencies();
    const requestsComponents = Object.keys(selectedAgencies).filter((key) => {
      const agency = selectedAgencies[key];
      const hasComponents = agency
        .filter(component => component.toLowerCase() !== 'agency overall');
      return hasComponents.length > 0;
    });

    return requestsComponents.length <= 0;
  }

  static transformToOverallFilters(filters, dataTypeId) {
    const fields = annualReportDataTypesStore.getFieldsForDataType(dataTypeId);
    return filters.map((filter) => {
      const field = fields
        .filter(data => data.id === filter.filterField.replace('.value', ''));
      if (field.length <= 0) {
        return false;
      }

      filter.filterField = field[0].filter === true ? field[0].overall_field : `${field[0].overall_field}.value`;
      return filter;
    }).filter(filter => filter !== false);
  }

  /**
   * Given an operation and two values, compares the two values.
   *
   * @param op
   * @param value
   * @param comparison
   * @returns {boolean}
   */
  static compare(op, value, comparison) {
    switch (op) {
      case 'greater_than': {
        return this.convertToNumber(value) > this.convertToNumber(comparison);
      }
      case 'less_than': {
        return this.convertToNumber(value) < this.convertToNumber(comparison);
      }
      case 'equal_to': {
        return this.convertToNumber(value) === this.convertToNumber(comparison);
      }
      case 'is_na': {
        return value.toLowerCase() === 'n/a';
      }
      default: {
        return false;
      }
    }
  }

  /**
   * Converts strings and special values to numbers.
   *
   * @param {String} value
   *   A string representing a numeric value.
   * @returns {number}
   *   A number.
   */
  static convertToNumber(value) {
    switch (String(value).toLowerCase()) {
      case '<1':
        return Number(0.1);

      default:
        return Number(value);
    }
  }

  /**
   * Recurses into an object to get a value at a given path.
   *
   * @param {string} path
   *   The path to get a value from, in dot notation.
   * @param {Object} object
   *   The object to recurse into.
   * @returns {*}
   */
  static getValue(path, object) {
    const parts = path.split('.');
    const field = parts.shift();
    if (parts.length === 0) {
      return object[field];
    }

    const next = object[field] || {};
    return this.getValue(parts.join('.'), next);
  }
}

export default FoiaAnnualReportFilterUtilities;
