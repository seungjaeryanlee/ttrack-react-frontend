import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';


class App extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      error: null,
      isLoaded: false,
      data: {}
    };
  }

  componentDidMount() {
    fetch("http://localhost:5000/api/all/2020-10-10")
      .then(res => res.json())
      .then(
        (result) => {
          this.setState({
            isLoaded: true,
            data: result
          });
        },
        // Note: it's important to handle errors here
        // instead of a catch() block so that we don't swallow
        // exceptions from actual bugs in components.
        (error) => {
          this.setState({
            isLoaded: true,
            error
          });
        }
      )
  }

  render() {
    const { error, isLoaded, data } = this.state;
    console.log(data);
    if (error) {
      return <div>Error: {error.message}</div>;
    } else if (!isLoaded) {
      return <div>Loading...</div>;
    } else {
      const { durations, line_labels, lines, task_labels, tasks } = data;
      const content = [];
      for (let i = 0; i < lines.length; i++) {
        content.push(
          <div key={i}>
            <span>{durations[i]}</span>
            &nbsp;
            <span>{lines[i]}</span>
            &nbsp;
            <span>{line_labels[i]}</span>
          </div>
        );
      }
      return (
        <div className="game">
          <ul>
            {content}
          </ul>
        </div>
      );
    }
  }
}

// ========================================

ReactDOM.render(
  <App />,
  document.getElementById('root')
);
