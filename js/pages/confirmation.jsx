import React, { Component } from 'react';
import { Container } from 'flux/utils';
import PropTypes from 'prop-types';
import { Map } from 'immutable';

import { requestActions } from 'actions';
import LandingComponent from '../components/landing';
import agencyComponentStore from '../stores/agency_component';
import { SubmissionResult } from 'models';

import Confirmation from 'components/confirmation';
import FoiaRequestForm from 'components/foia_request_form';
import Tabs from 'components/tabs';
import agencyComponentRequestFormStore from 'stores/agency_component_request_form';
import foiaRequestStore from 'stores/foia_request';
import NotFound from './not_found';
import faker from 'faker';


class ConfirmationPage extends Component {
  static getStores() {
    return [agencyComponentStore, foiaRequestStore, agencyComponentRequestFormStore];
  }

  static calculateState(prevState, props) {
    const agencyComponentId = props.match.params.agencyComponentId;
    const agencyComponent = agencyComponentStore.getAgencyComponent(agencyComponentId);
    const requestForm = agencyComponentRequestFormStore.getAgencyComponentForm(agencyComponentId);
    const submissionResult = new SubmissionResult({
      submission_id: '1534',
    });

    const formData = new Map({
      requester_contact: {
        name_first: 'Aaron',
        name_middle_initial_middle: 'D',
        name_last: 'Borden',
      },
      request_description: {
        request_description: faker.lorem.paragraphs(3),
      },
    });

    return {
      agencyComponent,
      formData,
      isSubmitting: false,
      submissionResult,
      requestForm,
    };
  }

  componentDidMount() {
    this.init(this.props);
  }

  componentWillReceiveProps(nextProps) {
    const agencyComponentId = this.props.match.params.agencyComponentId;
    if (nextProps.match.params.agencyComponentId !== agencyComponentId) {
      this.init(nextProps);
    }
  }

  init(props) {
    const agencyComponentId = props.match.params.agencyComponentId;

    // Check agency component exists in store
    const { agencyComponent } = this.state;
    if (!agencyComponent || !agencyComponent.formFields.length) {
      requestActions.fetchAgencyComponent(agencyComponentId)
        .then(requestActions.receiveAgencyComponent)
        .catch((error) => {
          if (!error.response) {
            // Non-axios error, rethrow
            throw error;
          }

          if (error.response.status !== 404) {
            // API error other than 404, rethrow
            throw error;
          }

          this.setState({
            agencyComponentNotFound: true,
          });
        });
    }
  }

  render() {
    const { agencyComponent, formData, requestForm, submissionResult } = this.state;
    if (this.state.agencyComponentNotFound) {
      // The api returned a 404, we should do the same
      return <NotFound />;
    }

    function onSubmit() {}

    let mainContent;
    if (agencyComponent && agencyComponent.title && submissionResult && submissionResult.submission_id) {
      mainContent = (
        <Confirmation
          agencyComponent={agencyComponent}
          formData={formData}
          requestForm={requestForm}
          submissionResult={submissionResult}
        />
      );
    } else if (requestForm) {
      mainContent = (
        <FoiaRequestForm
          formData={this.state.formData}
          isSubmitting={this.state.isSubmitting}
          onSubmit={onSubmit}
          requestForm={requestForm}
          submissionResult={this.state.submissionResult}
        />
      );
    } else {
      // TODO show a loading indicator?
      mainContent = <div>Loading…</div>;
    }

    return (
      <div className="usa-grid-full grid-left">
        <aside className="usa-width-five-twelfths sidebar print-hide" id="react-tabs">
          {
            agencyComponent && requestForm ?
              <Tabs
                agencyComponent={agencyComponent}
                requestForm={requestForm}
              /> :
              null
          }
        </aside>
        <div className="usa-width-seven-twelfths sidebar_content">
          { mainContent }
        </div>
      </div>
    );
  }
}

ConfirmationPage.propTypes = {
  match: PropTypes.object.isRequired,
};

export default Container.create(ConfirmationPage, { withProps: true });