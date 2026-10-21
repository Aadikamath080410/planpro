import React, { ReactNode } from "react";

interface Props {
  children: ReactNode; // Explicitly define children
}

interface State {
  hasError: boolean;
  error: Error | null;
}

// Update the first generic from {} to Props
export default class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: any) {
    console.error("ErrorBoundary caught:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 20, color: "red", background: "#fff" }}>
          <h3>Something went wrong loading AR.</h3>
          <p>Please ensure you are on a mobile device and have given camera permissions.</p>
          <pre style={{ fontSize: "12px" }}>{this.state.error?.message}</pre>
          <button onClick={() => window.location.reload()}>Try Again</button>
        </div>
      );
    }

    // No need to cast 'as React.ReactElement' anymore
    return this.props.children;
  }
}
