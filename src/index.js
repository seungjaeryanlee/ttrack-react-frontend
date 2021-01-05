import React from 'react';
import ReactDOM from 'react-dom';
import { Doughnut, Pie } from 'react-chartjs-2';
import { Button, Col, Row, Select, Tabs, Typography } from 'antd';
import dayjs from 'dayjs';
import ChartDataLabels from 'chartjs-plugin-datalabels'; // eslint-disable-line

import { parseLog } from './logParser';
import { DatePicker } from './DatePicker';

import "antd/dist/antd.css";
import './index.css';


const { Option } = Select;
const { TabPane } = Tabs;
const { Title, Text } = Typography;


class App extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      error: null,
      isLoaded: false,
      data: {},
      log: "",
      logDate: dayjs("2021-01-01"),
      task_to_label: {},
    };
  }

  componentDidMount() {
    // NOTE: Promise for multiple fetches: https://stackoverflow.com/a/52883003/2577392
    Promise.all([
      fetch(`http://localhost:5000/api/log/${this.state.logDate.format("YYYY-MM-DD")}`),
      fetch(`http://localhost:5000/api/rules/all`)
    ])
      .then(([res1, res2]) => {
        return Promise.all([res1.json(), res2.json()])
      })
      .then(([res1, res2]) => {
          this.setState({
            isLoaded: true,
            log: res1.log,
            data: parseLog(res1.log, res2),
            task_to_label: res2,
          })
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
 
  setLogDate(logDate, logDateString) {
    this.setState({ logDate });

    // Reload LOG textarea
    const logDateStr = logDate.format("YYYY-MM-DD");
    fetch(`http://localhost:5000/api/log/${logDateStr}`)
      .then((res) => res.json())
      .then(
        (result) => {
          this.setState({
            log: result.log,
            data: parseLog(result.log, this.state.task_to_label),
          })
        },
        (error) => {
          this.setState({
            error
          })
        }
      )
  }

  onLogTextareaChange(event) {
    this.setState({
      log: event.target.value,
      data: parseLog(this.state.log, this.state.task_to_label),
    });
  }

  saveLog() {
    const requestOptions = {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date: this.state.logDate.format("YYYY-MM-DD") , log: this.state.log })
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

  updateTaskLabel(task, task_label) {
    fetch(`http://localhost:5000/api/rules/add`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ task, task_label })
    })
      .then((res) => res.json())
      .then(
        (result) => {
          if (result.status === "success") {
            let new_task_to_label = this.state.task_to_label;
            new_task_to_label[task] = task_label;
            this.setState({
              task_to_label: new_task_to_label,
              data: parseLog(this.state.log, new_task_to_label),
            })
            console.log("Success");
          }
        },
        (error) => {
          this.setState({ error })
        }
      )
  }

  getUnknownTasks() {
    const flat_tasks = this.state.data.tasks.flat();
    const flat_task_labels = this.state.data.task_labels.flat();

    // Sort and remove duplicate unknown tasks
    let unknown_tasks = [];
    for (let i = 0; i < flat_tasks.length; i++) {
      if (flat_task_labels[i] === "Unknown") {
        unknown_tasks.push(flat_tasks[i]);
      }
    }
    unknown_tasks.sort();
    unknown_tasks = [...new Set(unknown_tasks)];

    let elements = [];

    for (let i = 0; i < unknown_tasks.length; i++) {
      const task = unknown_tasks[i];

      // TODO: Use LABEL_PRIORITIES
      elements.push(
        <Row justify="space-between" key={task} style={{ backgroundColor: (i % 2 === 0) ? "white" : "#EEEEEE" }}>
          <Col>
            <Text>{task}</Text>
          </Col>
          <Col>
            <Select defaultValue="Unknown" onChange={(new_task_label) => this.updateTaskLabel(task, new_task_label)} style={{ width: 200 }}>
              <Option value="School and Work">School and Work</Option>
              <Option value="Personal Development">Personal Development</Option>
              <Option value="Personal Well-being">Personal Well-being</Option>
              <Option value="Misc">Misc</Option>
              <Option value="Personal Enjoyment">Personal Enjoyment</Option>
              <Option value="Ignore">Ignore</Option>
              <Option value="Unknown">Unknown</Option>
            </Select>
          </Col>
        </Row>
      );
    }

    return elements;
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
        <div>
          <div className="container">
            <div className="charts-container">
              <Row>
                <Col span={8}>
                  <Title level={5}>AM</Title>
                  <Pie data={amData} options={clockOptions}/>
                  </Col>
                <Col span={8}>
                  <Title level={5}>PM</Title>
                  <Pie data={pmData} options={clockOptions}/>
                </Col>
                <Col span={8}>
                  <Title level={5}>Summary</Title>
                  <Doughnut data={summaryData} options={summaryOptions}/>
                  </Col>
              </Row>
            </div>
            
            <Tabs defaultActiveKey="1">
              <TabPane tab="LOG" key="1">
                <div className="log-container">
                  <DatePicker value={this.state.logDate} onChange={(date, dateString) => this.setLogDate(date, dateString)} />
                  <textarea id="log" value={this.state.log} onChange={(event) => this.onLogTextareaChange(event)}></textarea>
                  <Button type="primary" onClick={this.saveLog.bind(this)}>Save LOG</Button>
                </div>
              </TabPane>
              <TabPane tab="Classifier" key="2">
                {this.getUnknownTasks()}
              </TabPane>
            </Tabs>
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
