import React from 'react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        console.error("Uncaught error:", error, errorInfo);
        this.setState({ error, errorInfo });
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="p-8 m-4 border-2 border-red-500 bg-red-50 text-red-900 rounded-lg">
                    <h2 className="text-2xl font-bold mb-4">Something went wrong.</h2>
                    <details className="whitespace-pre-wrap">
                        <summary>Click for error details</summary>
                        <p className="mt-2 font-mono text-sm">{this.state.error && this.state.error.toString()}</p>
                        <p className="mt-2 font-mono text-xs text-gray-600">{this.state.errorInfo && this.state.errorInfo.componentStack}</p>
                    </details>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
