import React from 'react';
import ReactDOM from 'react-dom';
import { Doughnut, Pie } from 'react-chartjs-2';
import ChartDataLabels from 'chartjs-plugin-datalabels'; // eslint-disable-line
import './index.css';


class App extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      error: null,
      isLoaded: false,
      data: {},
      log: "Stub log",
    };
  }

  componentDidMount() {
    fetch("http://localhost:5000/api/all/2021-01-01")
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

  labelToColor(label) {
    if (label === "School and Work") {
        return "#bae1ff";
    } else if (label === "Personal Development") {
        return "#baffc9";
    } else if (label === "Personal Well-being") {
        return "#ffffba";
    } else if (label === "Misc") {
        return "#343d46";
    } else if (label === "Personal Enjoyment") {
        return "#ffb3ba";
    } else if (label === "Unknown") {
        return "#c0c5ce";
    } else {
        console.debug(label);
        return "#c0c5ce";
    }
  }

  prepareSummary(data) {
    const summaryOptions = {
      legend: { display: false },
      plugins: { datalabels: { render: "value", anchor: "end", align: "end", display: true } },layout: {
      // Padding to give space for datalabels
      padding: {
          left: 20,
          right: 20,
          top: 20,
          bottom: 20,
      }
    }
    };
    let durationSum = 0;
    let labelDurationSums = {
      "School and Work": 0,
      "Personal Development": 0,
      "Personal Well-being": 0,
      "Misc": 0,
      "Personal Enjoyment": 0,
      "Unknown": 0,
    };

    for (let i = 0; i < data.durations.length; i++) {
      const label = data.line_labels[i];
      const duration = data.durations[i];
      labelDurationSums[label] += duration;
      durationSum += duration;
    }

    let summaryData = { datasets: [{ data: [], backgroundColor: [], borderColor: [] }], labels: [] };
    for (let [label, duration] of Object.entries(labelDurationSums)) {
      const color = this.labelToColor(label);
      summaryData.datasets[0].data.push(duration);
      summaryData.datasets[0].backgroundColor.push(color);
      summaryData.labels.push(label);
    }
    // Add empty fragment for missing log
    if (durationSum < 24 * 60) {
      summaryData.datasets[0].data.push(24 * 60 - durationSum);
      summaryData.datasets[0].backgroundColor.push("#ffffff");
      summaryData.labels.push("");
    }

    return [summaryData, summaryOptions]
  }

  prepareClocks(data) {
    const clockOptions = {
      legend: {
        display: false
      },
      plugins: {
        datalabels: {
            display: false
        }
      }
    };

    const { durations, line_labels, lines } = data;
    let amData = { datasets: [{ data: [], backgroundColor: [], borderColor: [] }], labels: [] };
    let pmData = { datasets: [{ data: [], backgroundColor: [], borderColor: [] }], labels: [] };

    let durationSum = 0;
    let isPM = false;
    let unknownLines = [];
    for (let i = 0; i < durations.length; i++) {
        const duration = durations[i];
        const line = lines[i];
        const label = line_labels[i];
        const color = this.labelToColor(label);

        durationSum += duration;
        if (!isPM && durationSum > 60 * 12) {
            isPM = true;
            const amDuration = durationSum - 60 * 12;
            const pmDuration = duration - amDuration;
            amData.datasets[0].data.push(amDuration);
            amData.datasets[0].backgroundColor.push(color);
            amData.labels.push(line);
            pmData.datasets[0].data.push(pmDuration);
            pmData.datasets[0].backgroundColor.push(color);
            pmData.labels.push(line);
            continue;
        }
        if (!isPM) {
            amData.datasets[0].data.push(duration);
            amData.datasets[0].backgroundColor.push(color);
            amData.labels.push(line);
        } else {
            pmData.datasets[0].data.push(duration);
            pmData.datasets[0].backgroundColor.push(color);
            pmData.labels.push(line);
        }

        if (label === "Unknown") {
            unknownLines.push(line);
        }
    }

    // Add empty fragment for missing log
    if (durationSum < 60 * 12) {
        amData.datasets[0].data.push(60 * 12 - durationSum);
        amData.datasets[0].backgroundColor.push("#ffffff");
        amData.labels.push("");
    } else if (durationSum < 60 * 24) {
        pmData.datasets[0].data.push(60 * 24 - durationSum);
        pmData.datasets[0].backgroundColor.push("#ffffff");
        pmData.labels.push("");
    }

    return [amData, pmData, clockOptions]
  }

  onLogChange(event) {
    this.setState({ log: event.target.value });
  }

  saveLog() {
    const requestOptions = {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ log: this.state.log })
    };
    fetch('http://localhost:5000/api/log/save', requestOptions)
      .then(res => res.json())
      .then(
        (result) => {},
        (error) => {
          console.log(error);
        }
      )
  }

  render() {
    const { error, isLoaded, data } = this.state;
    if (error) {
      return <div>Error: {error.message}</div>;
    } else if (!isLoaded) {
      return <div>Loading...</div>;
    } else {
      let [amData, pmData, clockOptions] = this.prepareClocks(data);
      let [summaryData, summaryOptions] = this.prepareSummary(data);
      return (
        <div className="game">
          <div className="charts-container">
              <div className="amChart-container">
                  <h3>AM</h3>
                  <Pie data={amData} options={clockOptions}/>
              </div>
              <div className="pmChart-container">
                  <h3>PM</h3>
                  <Pie data={pmData} options={clockOptions}/>
              </div>
              <div className="donutChart-container">
                  <h3>Summary</h3>
                  <Doughnut data={summaryData} options={summaryOptions}/>
              </div>
          </div>
          <div className="log-container">
            <h2>LOG</h2>
            <textarea id="log" onChange={(event) => this.onLogChange(event)}></textarea>
            <button onClick={this.saveLog.bind(this)}>Save LOG</button>
          </div>
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
