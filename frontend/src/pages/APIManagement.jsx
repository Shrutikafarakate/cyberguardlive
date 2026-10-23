import { useEffect, useState } from "react";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";

import {
  getRegisteredApis,
  monitorApi,
  updateRegisteredApi,
  deleteRegisteredApi,
} from "../api";


const formatInterval = (value) => {
  if (!value) return "1 min";
  const num = parseInt(String(value).replace(/[^0-9]/g, ""), 10);
  if (isNaN(num)) return "1 min";
  if (num >= 60) {
    const mins = Math.round(num / 60);
    return `${mins} min${mins > 1 ? "s" : ""}`;
  }
  return `${num} sec`;
};


function APIManagement() {

  const [showForm, setShowForm] = useState(false);

  const [loading, setLoading] = useState(false);

  const [error, setError] = useState("");

  const [apis, setApis] = useState([]);

  const [editingApi, setEditingApi] = useState(null);


  const [form, setForm] = useState({
    name: "",
    endpoint: "",
    method: "GET",
    interval: "60",
  });


  // =========================
  // Fetch APIs
  // =========================

  useEffect(() => {

    fetchApis();

  }, []);


  const fetchApis = async () => {

    try {

      setLoading(true);

      const response =
        await getRegisteredApis();

      const mappedApis =
        (response.data || []).map((api) => ({

          id: api.url,

          name: api.api_name,

          endpoint: api.url,

          method: api.method || "GET",

          rawInterval: api.interval || "60",

          interval: formatInterval(api.interval),

          status:
            api.status === "ONLINE"
              ? "Online"
              : "Offline",

        }));


      setApis(mappedApis);

      setError("");

    } catch (err) {

      setError(
        "Unable to load APIs from the backend."
      );

      setApis([]);

    } finally {

      setLoading(false);

    }

  };


  // =========================
  // Add API
  // =========================

  const addAPI = async (e) => {

    e.preventDefault();

    try {

      setLoading(true);

      setError("");

      const payload = {

        api_name: form.name,

        url: form.endpoint,

        method: form.method,

        interval: form.interval,

      };


      await monitorApi(payload);

      await fetchApis();


      setForm({

        name: "",

        endpoint: "",

        method: "GET",

        interval: "60",

      });


      setShowForm(false);


    } catch (err) {

      setError(
        err?.response?.data?.detail ||
        "Failed to add API. Please check the URL and try again."
      );

    } finally {

      setLoading(false);

    }

  };


  // =========================
  // Start Edit
  // =========================

  const editAPI = (api) => {

    setEditingApi(api);

    setForm({

      name: api.name,

      endpoint: api.endpoint,

      method: api.method || "GET",

      interval: api.rawInterval || "60",

    });

    setShowForm(true);

    setError("");

  };


  // =========================
  // Save Edited API
  // =========================

  const saveEditedAPI = async (e) => {

    e.preventDefault();

    if (!editingApi) {
      return;
    }


    try {

      setLoading(true);

      setError("");


      const payload = {

        old_url: editingApi.endpoint,

        api_name: form.name,

        url: form.endpoint,

        method: form.method,

        interval: form.interval,

      };


      await updateRegisteredApi(
        payload
      );


      await fetchApis();


      setEditingApi(null);

      setShowForm(false);


      setForm({

        name: "",

        endpoint: "",

        method: "GET",

        interval: "60",

      });


    } catch (err) {

      setError(
        err?.response?.data?.detail ||
        "Failed to update API."
      );

    } finally {

      setLoading(false);

    }

  };


  // =========================
  // Delete API
  // =========================

  const deleteAPI = async (url) => {

    try {

      setLoading(true);

      setError("");

      await deleteRegisteredApi(url);

      await fetchApis();

    } catch (err) {

      setError(
        "Failed to delete API."
      );

    } finally {

      setLoading(false);
    }

  };


  // =========================
  // Close Form
  // =========================

  const closeForm = () => {

    setShowForm(false);

    setEditingApi(null);

    setError("");

    setForm({

      name: "",

      endpoint: "",

      method: "GET",

      interval: "60",

    });

  };


  return (

    <div className="app-layout">

      <Sidebar />


      <main className="main-content">

        <Topbar title="API Management" />


        <div className="page-content">


          {/* =========================
              PAGE HEADER
          ========================= */}

          <div className="page-header">

            <div>

              <span className="page-label">
                API CONFIGURATION
              </span>

              <h2>
                Registered APIs
              </h2>

              <p>
                Manage APIs monitored by
                CyberGuard Live.
              </p>

            </div>


            <button

              className="primary-button"

              onClick={() => {

                if (showForm) {

                  closeForm();

                } else {

                  setEditingApi(null);

                  setForm({

                    name: "",

                    endpoint: "",

                    method: "GET",

                    interval: "60",

                  });

                  setShowForm(true);

                  setError("");

                }

              }}

            >

              {showForm
                ? "× Close"
                : "+ Add New API"}

            </button>

          </div>


          {/* =========================
              ERROR
          ========================= */}

          {error && (

            <div

              className="form-card"

              style={{
                marginBottom: "18px",
                borderColor: "#f87171",
              }}

            >

              <p
                style={{
                  margin: 0,
                  color: "#b91c1c",
                }}
              >

                {error}

              </p>

            </div>

          )}


          {/* =========================
              ADD / EDIT FORM
          ========================= */}

          {showForm && (

            <div className="form-card">


              <div className="form-card-header">

                <div>

                  <h3>

                    {editingApi
                      ? "Edit API"
                      : "Add New API"}

                  </h3>


                  <p>

                    {editingApi
                      ? "Update the API details below."
                      : "Enter the API details to start monitoring."}

                  </p>

                </div>


                <button

                  className="close-form"

                  type="button"

                  onClick={closeForm}

                >

                  

                </button>

              </div>


              <form

                onSubmit={
                  editingApi
                    ? saveEditedAPI
                    : addAPI
                }

              >


                <div className="form-grid">


                  {/* API Name */}

                  <div className="form-group">

                    <label>
                      API Name
                    </label>


                    <input

                      required

                      value={form.name}

                      onChange={(e) =>

                        setForm({

                          ...form,

                          name:
                            e.target.value,

                        })

                      }

                      placeholder="Payment API"

                    />

                  </div>


                  {/* Endpoint */}

                  <div className="form-group">

                    <label>
                      Endpoint URL
                    </label>


                    <input

                      required

                      type="url"

                      value={form.endpoint}

                      onChange={(e) =>

                        setForm({

                          ...form,

                          endpoint:
                            e.target.value,

                        })

                      }

                      placeholder="https://api.example.com"

                    />

                  </div>


                  {/* Method */}

                  <div className="form-group">

                    <label>
                      Request Method
                    </label>


                    <select

                      value={form.method}

                      onChange={(e) =>

                        setForm({

                          ...form,

                          method:
                            e.target.value,

                        })

                      }

                    >

                      <option value="GET">
                        GET
                      </option>

                      <option value="POST">
                        POST
                      </option>

                      <option value="PUT">
                        PUT
                      </option>

                      <option value="DELETE">
                        DELETE
                      </option>

                    </select>

                  </div>


                  {/* Interval */}

                  <div className="form-group">

                    <label>
                      Monitoring Interval
                    </label>


                    <select

                      value={form.interval}

                      onChange={(e) =>

                        setForm({

                          ...form,

                          interval:
                            e.target.value,

                        })

                      }

                    >

                      <option value="30">
                        30 seconds
                      </option>

                      <option value="60">
                        60 seconds
                      </option>

                      <option value="300">
                        5 minutes
                      </option>

                      <option value="600">
                        10 minutes
                      </option>

                    </select>

                  </div>


                </div>


                {/* Buttons */}

                <div className="form-actions">


                  <button

                    type="button"

                    className="secondary-button"

                    onClick={closeForm}

                  >

                    Cancel

                  </button>


                  <button

                    type="submit"

                    className="primary-button"

                    disabled={loading}

                  >

                    {loading
                      ? "Saving..."
                      : editingApi
                      ? "Save Changes"
                      : "Add API"}

                  </button>


                </div>


              </form>

            </div>

          )}


          {/* =========================
              API REGISTRY
          ========================= */}

          <div className="dashboard-card">


            <div className="card-header">

              <div>

                <h3>
                  API Registry
                </h3>

                <p>

                  {apis.length}
                  {" "}
                  APIs registered

                </p>

              </div>


              <span className="table-status">

                ● Monitoring Ready

              </span>

            </div>


            <div className="table-wrapper">


              <table>


                <thead>

                  <tr>

                    <th>
                      API Name
                    </th>

                    <th>
                      Endpoint
                    </th>

                    <th>
                      Method
                    </th>

                    <th>
                      Interval
                    </th>

                    <th>
                      Status
                    </th>

                    <th>
                      Action
                    </th>

                  </tr>

                </thead>


                <tbody>


                  {loading &&
                  apis.length === 0 ? (

                    <tr>

                      <td
                        colSpan="6"
                        style={{
                          textAlign:
                            "center",
                          padding:
                            "20px",
                        }}
                      >

                        Loading APIs...

                      </td>

                    </tr>

                  ) : apis.length === 0 ? (

                    <tr>

                      <td
                        colSpan="6"
                        style={{
                          textAlign:
                            "center",
                          padding:
                            "20px",
                        }}
                      >

                        No APIs registered.

                      </td>

                    </tr>

                  ) : (

                    apis.map((api) => (

                      <tr
                        key={api.id}
                      >


                        {/* Name */}

                        <td>

                          <div className="api-name-cell">

                            <div className="api-mini-icon">
                              ◈
                            </div>

                            <strong>
                              {api.name}
                            </strong>

                          </div>

                        </td>


                        {/* Endpoint */}

                        <td className="endpoint">

                          {api.endpoint}

                        </td>


                        {/* Method */}

                        <td>

                          <span className="method">

                            {api.method}

                          </span>

                        </td>


                        {/* Interval */}

                        <td>

                          {api.interval}

                        </td>


                        {/* Status */}

                        <td>

                          <span

                            className={

                              api.status ===
                              "Online"

                                ? "status online"

                                : "status offline"

                            }

                          >

                            ● {api.status}

                          </span>

                        </td>


                        {/* Actions */}

                        <td>


                          <button

                            className="action-button"

                            type="button"

                            onClick={() =>
                              editAPI(api)
                            }

                            title="Edit API"

                          >

                            ✏️

                          </button>


                          <button

                            className="action-button delete"

                            type="button"

                            onClick={() =>
                              deleteAPI(
                                api.endpoint
                              )
                            }

                            title="Delete API"

                          >

                            🗑️

                          </button>


                        </td>


                      </tr>

                    ))

                  )}


                </tbody>


              </table>

            </div>

          </div>


        </div>

      </main>

    </div>

  );

}


export default APIManagement;