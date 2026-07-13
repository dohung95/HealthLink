import { Component } from 'react';

export default class MapSurfaceErrorBoundary extends Component {
  state = { retryKey: 0, failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  handleRetry = () => this.setState((state) => ({ failed: false, retryKey: state.retryKey + 1 }));

  render() {
    if (this.state.failed) {
      return <div className="alert alert-warning m-0 h-100 d-flex align-items-center justify-content-between">Map unavailable.<button className="btn btn-sm btn-outline-warning" onClick={this.handleRetry} type="button">Retry</button></div>;
    }
    return <div key={this.state.retryKey} className="h-100">{this.props.children}</div>;
  }
}
