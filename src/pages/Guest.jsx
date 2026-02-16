export default function Guest() {
  return (
    <>
      {/* top bar */}
      <header className="top-bar g-topbar">
        <h1 className="page-title">Guest</h1>

        <div className="g-actions">
          <div className="search-wrap">
            <img src="/assets/images/search.png" alt="search" />
            <input type="text" placeholder="Search by Guest Name" />
          </div>


        </div>
      </header>

      {/* table card */}
      <section className="g-card">
        <div className="g-table-wrap">
          <table className="g-table">
            <colgroup>
              <col style={{ width: "150px" }} />
              <col style={{ width: "220px" }} />
              <col style={{ width: "220px" }} />
              <col style={{ width: "160px" }} />
              <col style={{ width: "200px" }} />
              <col style={{ width: "70px" }} />
            </colgroup>

            <thead>
              <tr>
                <th>Guest ID</th>
                <th>Name</th>
                <th>Contact</th>
                <th>Gender</th>
                <th>Date of Birth</th>
                <th className="col-actions">
                  <img
                    src="/assets/images/more.png"
                    alt="more"
                    className="more-icon"
                  />
                </th>
              </tr>
            </thead>

            <tbody>
              <tr>
                <td>G0001</td>
                <td>Jill Santiago</td>
                <td>099786453456</td>
                <td>Female</td>
                <td>2000-05-14</td>
                <td className="col-actions">
                  <img
                    src="/assets/images/sales.png"
                    alt="action"
                    className="row-icon"
                  />
                </td>
              </tr>

              <tr>
                <td>G0002</td>
                <td>Mart Santiago</td>
                <td>093648975264</td>
                <td>Male</td>
                <td>1999-08-26</td>
                <td className="col-actions">
                  <img
                    src="/assets/images/sales.png"
                    alt="action"
                    className="row-icon"
                  />
                </td>
              </tr>

              <tr>
                <td>G0003</td>
                <td>Ann Flores</td>
                <td>096459233789</td>
                <td>Female</td>
                <td>1994-03-02</td>
                <td className="col-actions">
                  <img
                    src="/assets/images/sales.png"
                    alt="action"
                    className="row-icon"
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
