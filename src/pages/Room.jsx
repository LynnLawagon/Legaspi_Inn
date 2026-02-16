export default function Room() {
  return (
    <>
      {/* top bar */}
      <header className="top-bar room-topbar">
        <h1 className="page-title">Room</h1>

        <div className="room-actions">
          <div className="search-wrap">
            <img src="/assets/images/search.png" alt="search" />
            <input type="text" placeholder="Search by Room # or Type" />
          </div>


        </div>
      </header>

      {/* table card */}
      <section className="room-card">
        <div className="room-table-wrap">
          <table className="room-table">
            <colgroup>
              <col style={{ width: "140px" }} />
              <col style={{ width: "160px" }} />
              <col style={{ width: "140px" }} />
              <col style={{ width: "160px" }} />
              <col style={{ width: "180px" }} />
              <col style={{ width: "70px" }} />
            </colgroup>

            <thead>
              <tr>
                <th>Room #</th>
                <th>Type</th>
                <th>Rate</th>
                <th>Capacity</th>
                <th>Status</th>
                <th className="th-more">...</th>
              </tr>
            </thead>

            <tbody>
              <tr>
                <td>R101</td>
                <td>Single</td>
                <td>80.00</td>
                <td>2</td>
                <td>Occupied</td>
                <td className="td-more">
                  <img src="/assets/images/more.png" alt="more" />
                </td>
              </tr>

              <tr>
                <td>R107</td>
                <td>Single</td>
                <td>200.00</td>
                <td>1</td>
                <td>Occupied</td>
                <td className="td-more">
                  <img src="/assets/images/more.png" alt="more" />
                </td>
              </tr>

              <tr>
                <td>R102</td>
                <td>Double</td>
                <td>400.00</td>
                <td>4</td>
                <td>Reserved</td>
                <td className="td-more">
                  <img src="/assets/images/more.png" alt="more" />
                </td>
              </tr>

              <tr>
                <td>R103</td>
                <td>Single</td>
                <td></td>
                <td></td>
                <td>Available</td>
                <td className="td-more">
                  <img src="/assets/images/more.png" alt="more" />
                </td>
              </tr>

              <tr>
                <td>R104</td>
                <td>Single</td>
                <td></td>
                <td></td>
                <td>Available</td>
                <td className="td-more">
                  <img src="/assets/images/more.png" alt="more" />
                </td>
              </tr>

              <tr>
                <td>R105</td>
                <td>Single</td>
                <td></td>
                <td></td>
                <td>Available</td>
                <td className="td-more">
                  <img src="/assets/images/more.png" alt="more" />
                </td>
              </tr>

              <tr>
                <td>R106</td>
                <td>Single</td>
                <td></td>
                <td></td>
                <td>Available</td>
                <td className="td-more">
                  <img src="/assets/images/more.png" alt="more" />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
